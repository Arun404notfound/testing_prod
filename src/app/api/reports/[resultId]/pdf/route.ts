import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import puppeteer, { type Page } from "puppeteer";
import { PDFDocument } from "pdf-lib";
import { canAccessReport } from "@/lib/auth/report-access";
import { getSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { getReportPayloadForAccess } from "@/lib/report-payload-for-access";
import { pdfFileName } from "@/lib/pdf-filename";
import { formatReportCompletedDate } from "@/lib/report-date";
import { mergeReportTheme, resolveLogoUrl } from "@/lib/report-branding";

export const runtime = "nodejs";
export const maxDuration = 60;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function withSection(url: string, section: "cover" | "body"): string {
  const u = new URL(url);
  u.searchParams.set("section", section);
  return u.toString();
}

/**
 * Renders the report by pointing headless Chrome at the print-only route
 * ([resultId]/print) and printing it with the browser's real layout/paint
 * engine — this is what replaced the old html2canvas+jsPDF pipeline, which
 * rasterized the DOM by hand and distorted anything taller than one A4 page.
 *
 * The cover and the body pages are printed as two separate passes and merged,
 * because they need different Puppeteer page.pdf() settings: the cover has no
 * running header/footer template at all (it renders its own full-bleed title
 * block), while every body page gets a native header/footer that Chrome's
 * print engine repeats at a fixed position on *every* physical page — the
 * only way to guarantee the footer stays pinned to the true bottom edge even
 * when a competency's content spills across two physical pages, which an
 * in-flow footer element in the page's own DOM fundamentally can't do.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ resultId: string }> },
) {
  const { resultId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const session = await getSession();

  if (!(await canAccessReport(resultId, { session, token }))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getReportPayloadForAccess(resultId, { session, token });
  if (!payload) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const origin = `${url.protocol}//${url.host}`;
  const printUrl = `${origin}/reports/${resultId}/print${token ? `?token=${encodeURIComponent(token)}` : ""}`;

  const completedDate = formatReportCompletedDate(payload.completedAt);
  const theme = mergeReportTheme(payload.tenantBranding);
  const pageLabel = escapeHtml(payload.assessmentName);
  const footerMeta = escapeHtml(
    [payload.candidateName, payload.tenantName, completedDate].filter(Boolean).join(" · "),
  );
  // Puppeteer's header/footer template renders in an isolated context that doesn't
  // reliably fetch network images — a data: URI is the only dependable way to get
  // the logo to show up there, even though a plain <img src> works fine in the
  // regular page content.
  const rawLogo = resolveLogoUrl(payload.tenantBranding);
  const logoAbsUrl = rawLogo ? (rawLogo.startsWith("http") || rawLogo.startsWith("data:") ? rawLogo : `${origin}${rawLogo}`) : null;
  const logoDataUri = await (async () => {
    if (!logoAbsUrl) return null;
    if (logoAbsUrl.startsWith("data:")) return logoAbsUrl;
    try {
      const res = await fetch(logoAbsUrl);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || "image/webp";
      return `data:${contentType};base64,${buf.toString("base64")}`;
    } catch {
      return null;
    }
  })();

  const headerTemplate = `
    <div style="width:100%;font-size:10px;padding:0 40px;display:flex;align-items:center;justify-content:space-between;color:${theme.ink};font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:8px;">
        ${logoDataUri ? `<img src="${logoDataUri}" style="height:20px;max-width:110px;object-fit:contain;" />` : ""}
        <span style="width:10px;height:10px;background:${theme.accent};display:inline-block;"></span>
        <span style="font-weight:600;">${pageLabel}</span>
      </div>
      <span style="font-weight:600;color:${theme.body};">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`;

  const footerTemplate = `
    <div style="width:100%;font-size:9px;padding:6px 40px 0;display:flex;align-items:baseline;justify-content:space-between;color:${theme.body};font-family:Arial,Helvetica,sans-serif;border-top:1px solid ${theme.hairline};box-sizing:border-box;">
      <span>${footerMeta}</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const newAuthedPage = async () => {
      const p = await browser.newPage();
      if (session) {
        const jar = await cookies();
        const sessionToken = jar.get(SESSION_COOKIE_NAME)?.value;
        if (sessionToken) {
          await p.setCookie({ name: SESSION_COOKIE_NAME, value: sessionToken, url: origin });
        }
      }
      return p;
    };

    const printSection = async (target: Page, section: "cover" | "body"): Promise<Uint8Array> => {
      await target.goto(withSection(printUrl, section), { waitUntil: "networkidle0" });
      await target.evaluateHandle("document.fonts.ready");
      if (section === "cover") {
        return target.pdf({ format: "a4", printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
      }
      return target.pdf({
        format: "a4",
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: { top: "20mm", bottom: "18mm", left: 0, right: 0 },
      });
    };

    // Two independent pages/tabs so the cover and body print passes run concurrently
    // instead of back-to-back — same output, roughly half the wall-clock time.
    const [coverPage, bodyPage] = await Promise.all([newAuthedPage(), newAuthedPage()]);
    const [coverBuffer, bodyBuffer] = await Promise.all([
      printSection(coverPage, "cover"),
      printSection(bodyPage, "body"),
    ]);

    const merged = await PDFDocument.create();
    for (const buf of [coverBuffer, bodyBuffer]) {
      const src = await PDFDocument.load(buf);
      const copiedPages = await merged.copyPages(src, src.getPageIndices());
      copiedPages.forEach((p) => merged.addPage(p));
    }
    const mergedBytes = await merged.save();

    return new NextResponse(new Uint8Array(mergedBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFileName(payload.assessmentName)}"`,
      },
    });
  } finally {
    await browser.close();
  }
}

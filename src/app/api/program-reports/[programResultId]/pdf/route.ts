import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { canAccessProgramReport } from "@/lib/auth/report-access";
import { getSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { getProgramReportPayloadForAccess } from "@/lib/report-payload-for-access";
import { pdfFileName } from "@/lib/pdf-filename";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Renders the combined Program report by pointing headless Chrome at the
 * print-only route ([programResultId]/print) and printing it — mirrors
 * api/reports/[resultId]/pdf/route.ts exactly, one level up.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ programResultId: string }> },
) {
  const { programResultId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const session = await getSession();

  if (!(await canAccessProgramReport(programResultId, { session, token }))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getProgramReportPayloadForAccess(programResultId, { session, token });
  if (!payload) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const origin = `${url.protocol}//${url.host}`;
  const printUrl = `${origin}/program-reports/${programResultId}/print${token ? `?token=${encodeURIComponent(token)}` : ""}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    if (session) {
      const jar = await cookies();
      const sessionToken = jar.get(SESSION_COOKIE_NAME)?.value;
      if (sessionToken) {
        await page.setCookie({ name: SESSION_COOKIE_NAME, value: sessionToken, url: origin });
      }
    }

    await page.goto(printUrl, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");

    await page
      .waitForFunction(() => document.querySelectorAll('[data-fit="pending"]').length === 0, { timeout: 8000 })
      .catch(() => {});

    await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 300)));

    const pdfBuffer = await page.pdf({
      format: "a4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFileName(payload.programTitle)}"`,
      },
    });
  } finally {
    await browser.close();
  }
}

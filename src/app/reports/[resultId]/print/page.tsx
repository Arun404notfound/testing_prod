import { notFound } from "next/navigation";
import { canAccessReport } from "@/lib/auth/report-access";
import { getSession } from "@/lib/auth/session";
import { getReportPayloadForAccess } from "@/lib/report-payload-for-access";
import { formatReportCompletedDate } from "@/lib/report-date";
import { ReportDocument } from "@/components/reports/ReportDocument";

export const runtime = "nodejs";

/**
 * Chrome-free, print-only rendering of a report — no header, no scroll
 * container, no Download button. This is the URL the server-side PDF route
 * ([resultId]/pdf/route.ts) points headless Chrome at; printing straight
 * from a real browser is what keeps the exported PDF pixel-identical to the
 * on-screen preview instead of the old html2canvas approximation of it.
 */
export default async function ReportPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ resultId: string }>;
  searchParams: Promise<{ token?: string; section?: string }>;
}) {
  const { resultId } = await params;
  const { token, section: rawSection } = await searchParams;
  const section = rawSection === "cover" || rawSection === "body" ? rawSection : "all";
  const session = await getSession();

  if (!(await canAccessReport(resultId, { session, token }))) {
    notFound();
  }

  const report = await getReportPayloadForAccess(resultId, { session, token });
  if (!report) notFound();

  const completedDate = formatReportCompletedDate(report.completedAt);

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        html, body {
          margin: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        /*
         * ReportPageShell is flex flex-col with minHeight: 297mm so a short page still
         * fills a visual sheet on screen, and its body is itself flex-1 flex-col so it
         * can grow to push the footer to the bottom. The flex-grow part doesn't survive
         * contact with Chrome's print engine once a competency's content is tall enough
         * to fragment across two physical pages — nested flex-grow containers being
         * fragmented produced real corruption (footer text overlapping card content
         * instead of following it). Forcing plain block layout removes that ambiguity:
         * header/body are just two ordinary blocks stacked in flow, however many
         * physical pages that ends up spanning.
         */
        .report-page,
        .report-page-body {
          display: block !important;
        }
        .report-page {
          position: relative;
          break-after: page;
        }
        .report-page:last-child {
          break-after: auto;
        }
        /*
         * The running header/footer is now a native Puppeteer header/footer
         * template (see [resultId]/pdf/route.ts) printed by Chrome itself at a
         * fixed position on every physical page, decoupled from document flow —
         * so it lands at the true bottom edge even when a competency's content
         * spills across two pages, which an in-flow footer element fundamentally
         * cannot do. The in-flow versions ReportPageShell still renders (for the
         * on-screen preview) are hidden here to avoid a duplicate.
         */
        .report-page-header,
        .report-page-footer {
          display: none !important;
        }
        [data-pdf-break-inside="avoid"] {
          break-inside: avoid;
        }
        [data-pdf-break-after="avoid"] {
          break-after: avoid;
        }
      `}</style>
      <ReportDocument report={report} completedDate={completedDate} section={section} />
    </>
  );
}

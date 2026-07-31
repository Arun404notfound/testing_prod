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
  searchParams: Promise<{ token?: string }>;
}) {
  const { resultId } = await params;
  const { token } = await searchParams;
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
        .report-page {
          break-after: page;
        }
        .report-page:last-child {
          break-after: auto;
        }
        [data-pdf-break-inside="avoid"] {
          break-inside: avoid;
        }
      `}</style>
      <ReportDocument report={report} completedDate={completedDate} />
    </>
  );
}

import { notFound } from "next/navigation";
import { canAccessProgramReport } from "@/lib/auth/report-access";
import { getSession } from "@/lib/auth/session";
import { getProgramReportPayloadForAccess } from "@/lib/report-payload-for-access";
import { formatReportCompletedDate } from "@/lib/report-date";
import { ProgramReportDocument } from "@/components/reports/ProgramReportDocument";
import { ReportPrintStyles } from "@/components/reports/ReportPrintStyles";

export const runtime = "nodejs";

/**
 * Chrome-free, print-only rendering of a combined Program report — mirrors
 * reports/[resultId]/print/page.tsx exactly, just one level up (ProgramResult
 * instead of AssessmentResult). This is the URL the server-side PDF route
 * ([programResultId]/pdf/route.ts) points headless Chrome at.
 */
export default async function ProgramReportPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ programResultId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { programResultId } = await params;
  const { token } = await searchParams;
  const session = await getSession();

  if (!(await canAccessProgramReport(programResultId, { session, token }))) {
    notFound();
  }

  const program = await getProgramReportPayloadForAccess(programResultId, { session, token });
  if (!program) notFound();

  const completedDate = formatReportCompletedDate(program.completedAt);

  return (
    <>
      <ReportPrintStyles />
      <ProgramReportDocument program={program} completedDate={completedDate} />
    </>
  );
}

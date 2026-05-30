import { NextResponse } from "next/server";
import { getDefaultTenantId } from "@/lib/tenant";
import { canAccessReport } from "@/lib/auth/report-access";
import { getSession } from "@/lib/auth/session";
import { getReportPayload } from "@/lib/report-data";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resultId: string }> },
) {
  const { resultId } = await params;
  const session = await getSession();
  if (!(await canAccessReport(resultId, session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload =
    session?.role === "CANDIDATE" && session.candidateId
      ? await getReportPayload(resultId, { kind: "candidate", candidateId: session.candidateId })
      : await getReportPayload(resultId, { kind: "portal", portalTenantId: await getDefaultTenantId() });

  if (!payload) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}

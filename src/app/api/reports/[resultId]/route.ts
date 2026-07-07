import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { canAccessReport } from "@/lib/auth/report-access";
import { getSession } from "@/lib/auth/session";
import { getReportPayload } from "@/lib/report-data";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resultId: string }> },
) {
  const { resultId } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const session = await getSession();

  if (!(await canAccessReport(resultId, { session, token }))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload;
  if (session?.role === "ADMIN" || session?.role === "SUPER_ADMIN") {
    payload = await getReportPayload(resultId, { kind: "portal", portalTenantId: await getDefaultTenantId() });
  } else {
    const result = await prisma.assessmentResult.findUnique({ where: { id: resultId }, select: { candidateId: true } });
    payload = result ? await getReportPayload(resultId, { kind: "candidate", candidateId: result.candidateId }) : null;
  }

  if (!payload) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}

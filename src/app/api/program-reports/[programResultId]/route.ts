import { NextResponse } from "next/server";
import { canAccessProgramReport } from "@/lib/auth/report-access";
import { getSession } from "@/lib/auth/session";
import { getProgramReportPayloadForAccess } from "@/lib/report-payload-for-access";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ programResultId: string }> },
) {
  const { programResultId } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const session = await getSession();

  if (!(await canAccessProgramReport(programResultId, { session, token }))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getProgramReportPayloadForAccess(programResultId, { session, token });

  if (!payload) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}

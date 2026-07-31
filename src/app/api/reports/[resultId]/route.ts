import { NextResponse } from "next/server";
import { canAccessReport } from "@/lib/auth/report-access";
import { getSession } from "@/lib/auth/session";
import { getReportPayloadForAccess } from "@/lib/report-payload-for-access";

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

  const payload = await getReportPayloadForAccess(resultId, { session, token });

  if (!payload) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}

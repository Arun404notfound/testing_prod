import { NextResponse } from "next/server";
import { getLatestReportPayload } from "@/lib/report-data";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getLatestReportPayload();
  if (!payload) {
    return NextResponse.json({ error: "No demo report found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}

import { NextResponse } from "next/server";
import { buildJobRoleTemplateWorkbook } from "@/lib/jobRoleTemplate";
import { unauthorizedIfNotAdmin } from "@/lib/auth/require-admin-api";

export const runtime = "nodejs";

export async function GET() {
  const denied = await unauthorizedIfNotAdmin();
  if (denied) return denied;

  const buffer = buildJobRoleTemplateWorkbook();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="job-role-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}

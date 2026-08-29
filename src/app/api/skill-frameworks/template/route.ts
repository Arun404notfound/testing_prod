import { NextResponse } from "next/server";
import { buildSkillFrameworkTemplateWorkbook } from "@/lib/skillFrameworkTemplate";
import { unauthorizedIfNotAdmin } from "@/lib/auth/require-admin-api";

export const runtime = "nodejs";

export async function GET() {
  const denied = await unauthorizedIfNotAdmin();
  if (denied) return denied;

  const buffer = buildSkillFrameworkTemplateWorkbook();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="skill-framework-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { buildTemplateCsv, type TemplateType } from "@/lib/import-templates";
import { unauthorizedIfNotAdmin } from "@/lib/auth/require-admin-api";

export const runtime = "nodejs";

const validTypes: TemplateType[] = [
  "CANDIDATES",
  "MCQ_QUESTIONS",
  "LIKERT_ITEMS",
  "TRIAD_ITEMS",
];

export async function GET(request: Request) {
  const denied = await unauthorizedIfNotAdmin();
  if (denied) return denied;
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as TemplateType | null;

  if (!type || !validTypes.includes(type)) {
    return NextResponse.json(
      { error: "Invalid template type." },
      { status: 400 },
    );
  }

  const template = buildTemplateCsv(type);
  return new NextResponse(template.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${template.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

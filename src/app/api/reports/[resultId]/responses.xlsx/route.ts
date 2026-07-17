import { NextResponse } from "next/server";
import { unauthorizedIfNotAdmin } from "@/lib/auth/require-admin-api";
import { getSubmissions } from "@/lib/get-submissions";
import { getDefaultTenantId } from "@/lib/tenant";
import { buildResponseWorkbook, responseExportFileName } from "@/lib/response-export";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resultId: string }> },
) {
  const denied = await unauthorizedIfNotAdmin();
  if (denied) return denied;

  const { resultId } = await params;
  const data = await getSubmissions(resultId, await getDefaultTenantId());
  if (!data) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const fileName = responseExportFileName(data);
  const workbook = buildResponseWorkbook(data);

  return new NextResponse(workbook, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unauthorizedIfNotAdmin } from "@/lib/auth/require-admin-api";

export async function GET(req: NextRequest) {
  const deny = await unauthorizedIfNotAdmin();
  if (deny) return deny;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ assessments: [], candidates: [] });

  const pattern = `%${q.toLowerCase()}%`;

  const [assessments, candidates] = await Promise.all([
    prisma.$queryRaw<{ id: string; title: string; status: string }[]>`
      SELECT id, title, status
      FROM "Assessment"
      WHERE lower(title) LIKE ${pattern}
      LIMIT 5
    `,
    prisma.$queryRaw<{ id: string; fullName: string; email: string }[]>`
      SELECT id, "fullName", email
      FROM "Candidate"
      WHERE lower("fullName") LIKE ${pattern}
         OR lower(email) LIKE ${pattern}
      LIMIT 5
    `,
  ]);

  return NextResponse.json({ assessments, candidates });
}

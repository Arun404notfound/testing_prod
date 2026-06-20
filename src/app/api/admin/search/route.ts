import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unauthorizedIfNotAdmin } from "@/lib/auth/require-admin-api";

export async function GET(req: NextRequest) {
  const deny = await unauthorizedIfNotAdmin();
  if (deny) return deny;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ assessments: [], candidates: [] });

  const [assessments, candidates] = await Promise.all([
    prisma.assessment.findMany({
      where: { title: { contains: q } },
      select: { id: true, title: true, status: true },
      take: 5,
    }),
    prisma.candidate.findMany({
      where: {
        OR: [
          { fullName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: { id: true, fullName: true, email: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ assessments, candidates });
}

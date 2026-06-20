import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unauthorizedIfNotAdmin } from "@/lib/auth/require-admin-api";

export async function GET(req: NextRequest) {
  const deny = await unauthorizedIfNotAdmin();
  if (deny) return deny;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ assessments: [], candidates: [], competencies: [] });

  const [assessments, candidates, competencies] = await Promise.all([
    prisma.assessment.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, status: true, type: true },
      take: 5,
    }),
    prisma.candidate.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { id: true, fullName: true, user: { select: { email: true } } },
      take: 5,
    }),
    prisma.competency.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ assessments, candidates, competencies });
}

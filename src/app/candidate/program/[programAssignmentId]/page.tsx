import { notFound, redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function CandidateProgramEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ programAssignmentId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { programAssignmentId } = await params;
  const { token } = await searchParams;
  if (!token) notFound();

  const programAssignment = await prisma.programAssignment.findUnique({
    where: { id: programAssignmentId },
    include: {
      candidate: { select: { fullName: true } },
      program: { select: { title: true } },
      assessmentAssignments: {
        orderBy: { programModuleOrder: "asc" },
        select: { id: true, accessToken: true, status: true },
      },
    },
  });

  if (!programAssignment || programAssignment.accessToken !== token) {
    notFound();
  }

  const nextModule = programAssignment.assessmentAssignments.find((a) => a.status !== "completed");
  if (nextModule) {
    redirect(`/candidate/test/${nextModule.id}?token=${nextModule.accessToken}`);
  }

  // Every module is complete — Program-level "Thank You".
  return (
    <div className="flex flex-1 items-center justify-center bg-[#F8FAFC] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-500" strokeWidth={2} />
        </div>
        <p className="text-xl font-semibold text-[#0F172A]">Thank You!</p>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          You&apos;ve completed <span className="font-medium text-[#0F172A]">{programAssignment.program.title}</span>.
          Your responses have been submitted successfully.
        </p>
        <p className="mt-6 text-xs text-[#94A3B8]">You may now close this window.</p>
      </div>
    </div>
  );
}

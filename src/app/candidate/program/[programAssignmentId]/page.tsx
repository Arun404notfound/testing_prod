import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";

const MODULE_LABELS: Record<string, string> = {
  PSYCHOMETRIC: "Psychometric",
  TECHNICAL: "Technical",
  SURVEY: "Survey",
};

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
        select: {
          id: true,
          accessToken: true,
          status: true,
          assessment: { select: { title: true, moduleType: true } },
        },
      },
    },
  });

  if (!programAssignment || programAssignment.accessToken !== token) {
    notFound();
  }

  const modules = programAssignment.assessmentAssignments;
  const nextModule = modules.find((a) => a.status !== "completed");

  // At least one module still to do — show the Program overview (what's
  // included, what's done so far) with a button into the next module, rather
  // than redirecting straight into it. Module-to-module transitions after
  // that are handled by the test runner's own completion overlay.
  if (nextModule) {
    const completedCount = modules.filter((a) => a.status === "completed").length;
    const isFirstVisit = completedCount === 0;

    return (
      <div className="flex flex-1 items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#2563EB] via-[#10B981] to-[#1D4EDB]" />
          <div className="px-8 py-7">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">Program Assigned</p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-[#0F172A]">
              {programAssignment.program.title}
            </h1>
            <p className="mt-1 text-sm font-medium text-[#64748B]">{programAssignment.candidate.fullName}</p>

            <p className="mt-4 text-sm leading-relaxed text-[#475569]">
              {isFirstVisit
                ? `This program includes ${modules.length} module${modules.length === 1 ? "" : "s"}, completed one after another. Here's what to expect:`
                : `You've completed ${completedCount} of ${modules.length} module${modules.length === 1 ? "" : "s"} so far. Here's what's left:`}
            </p>

            <ul className="mt-5 space-y-2">
              {modules.map((m, i) => {
                const done = m.status === "completed";
                const isNext = m.id === nextModule.id;
                return (
                  <li
                    key={m.id}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                      isNext
                        ? "border-[#2563EB] bg-[#EFF6FF]"
                        : done
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-[#E2E8F0] bg-[#F8FAFC]"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        done
                          ? "bg-emerald-500 text-white"
                          : isNext
                            ? "bg-[#2563EB] text-white"
                            : "border border-[#CBD5E1] bg-white text-[#94A3B8]"
                      }`}
                    >
                      {done ? <CheckCircle2 size={14} /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0F172A]">{m.assessment.title}</p>
                      <p className="text-xs text-[#94A3B8]">
                        {MODULE_LABELS[m.assessment.moduleType] ?? m.assessment.moduleType}
                      </p>
                    </div>
                    {done && (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                        Done
                      </span>
                    )}
                    {isNext && (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#2563EB]">
                        Up next
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            <Link
              href={`/candidate/test/${nextModule.id}?token=${nextModule.accessToken}`}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-3 text-sm font-bold text-white transition hover:bg-[#1D4ED8] active:scale-[0.98]"
            >
              {isFirstVisit ? "Start Program" : "Continue to Next Module"}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    );
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

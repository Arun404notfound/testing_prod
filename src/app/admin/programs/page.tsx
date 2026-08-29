import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { BackToDashboard } from "@/components/ui/back-to-dashboard";
import { getDefaultTenantId } from "@/lib/tenant";

const COMPOSITION_LABELS: Record<string, string> = {
  PSYCHOMETRIC: "Psychometric",
  TECHNICAL: "Technical",
  SURVEY: "Survey",
  MIXED: "Mixed",
};

export default async function ProgramsPage() {
  const tenantId = await getDefaultTenantId();

  const [programs, unattachedAssessments] = await Promise.all([
    prisma.program.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        assessments: {
          orderBy: { displayOrder: "asc" },
          include: { assessment: { select: { id: true, title: true, moduleType: true, lifecycleStatus: true } } },
        },
      },
    }),
    prisma.assessment.findMany({
      where: { tenantId, programAssessments: { none: {} } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, moduleType: true, lifecycleStatus: true },
    }),
  ]);

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="Programs"
        subtitle="A Program bundles one or more Modules (Assessments) into a single candidate-facing test. Pick Psychometric/Technical/Survey for a single module, or Mixed to combine several."
        right={
          <div className="flex items-center gap-3">
            <BackToDashboard />
            <Link href="/admin/programs/new" className="tg-button-primary text-sm">
              New Program
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        {programs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-12 text-center text-sm text-[#64748B]">
            No programs yet.{" "}
            <Link href="/admin/programs/new" className="font-medium text-[#0F766E] hover:underline">
              Create one →
            </Link>
          </div>
        ) : (
          programs.map((program) => (
            <div key={program.id} className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between border-b border-[#F1F5F9]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold text-[#0F172A]">{program.title}</p>
                    <span className="inline-flex items-center rounded-full border border-[#D1FAE5] bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#2563EB]">
                      {COMPOSITION_LABELS[program.compositionType] ?? program.compositionType}
                    </span>
                  </div>
                  {program.description && (
                    <p className="mt-1.5 max-w-2xl text-sm text-[#64748B]">{program.description}</p>
                  )}
                </div>
                <div className="shrink-0">
                  <Link
                    href={`/admin/programs/${program.id}/builder`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#EFF6FF] transition"
                  >
                    Open →
                  </Link>
                </div>
              </div>
              <div className="px-5 py-3">
                {program.assessments.length === 0 ? (
                  <p className="text-sm text-[#94A3B8]">No modules attached yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {program.assessments.map((pa) => (
                      <span key={pa.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-[#334155]">
                        <span className="font-semibold text-[#0F172A]">{pa.assessment.moduleType}</span>
                        {pa.assessment.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {unattachedAssessments.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="border-b border-amber-200 bg-amber-100/50 px-5 py-3">
            <h2 className="text-sm font-semibold text-amber-900">Unattached modules ({unattachedAssessments.length})</h2>
            <p className="mt-0.5 text-xs text-amber-800">
              Assessments not attached to any Program. Deleting a Program deletes its modules too — except a module still attached to another Program
              (left alone) or blocked from deletion because it has candidate data (stays attached until you detach it or resolve that data); either of
              those land here once manually detached.
            </p>
          </div>
          <div className="divide-y divide-amber-100">
            {unattachedAssessments.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800">{a.moduleType}</span>
                  <span className="text-[#0F172A]">{a.title}</span>
                  <span className="text-xs text-[#94A3B8]">({a.lifecycleStatus})</span>
                </div>
                <Link href={`/admin/assessments/${a.id}/builder`} className="text-xs font-medium text-[#0F766E] hover:underline">
                  Edit content →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

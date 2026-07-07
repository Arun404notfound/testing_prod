import Link from "next/link";
import { BackToDashboard } from "@/components/ui/back-to-dashboard";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";

// Human-readable labels for assessment types
const TYPE_LABELS: Record<string, string> = {
  KNOWLEDGE_MCQ: "MCQ / Knowledge",
  LIKERT_PSYCHOMETRIC: "Big Five Likert",
  FORCED_CHOICE_TRIAD: "Forced-Choice Triad",
  HYBRID: "Hybrid (Likert + Triad)",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
};

export default async function AssessmentsPage() {
  const assessments = await prisma.assessment.findMany({
    include: {
      questions: true,
      compositionItems: {
        include: {
          sourceItem: {
            include: {
              attribute: {
                include: {
                  competencyMaps: { include: { competency: { select: { id: true, name: true } } } },
                },
              },
            },
          },
          sourceTriad: {
            include: {
              statements: {
                include: {
                  attribute: {
                    include: {
                      competencyMaps: { include: { competency: { select: { id: true, name: true } } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      sections: {
        include: {
          items: {
            include: {
              attribute: {
                include: {
                  competencyMaps: { include: { competency: { select: { id: true, name: true } } } },
                },
              },
            },
          },
          triadGroups: {
            include: {
              statements: {
                include: {
                  attribute: {
                    include: {
                      competencyMaps: { include: { competency: { select: { id: true, name: true } } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      tenant: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="Assessment Builder"
        subtitle="Create assessments, add items in the builder, then publish before assigning."
        right={
          <div className="flex items-center gap-3">
            <BackToDashboard />
            <Link href="/admin/assessments/new" className="tg-button-primary text-sm">
              New assessment
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        {assessments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-12 text-center text-sm text-[#64748B]">
            No assessments yet.{" "}
            <Link href="/admin/assessments/new" className="font-medium text-[#0F766E] hover:underline">
              Create one →
            </Link>
          </div>
        ) : (
          assessments.map((assessment) => {
            // ── Item counts ──────────────────────────────────────────────────
            const mcqCount = assessment.questions.length;
            const poolCount = assessment.compositionItems.length;

            // Direct Likert items and Triad groups stored on the assessment's sections
            const directLikertCount = assessment.sections.reduce(
              (sum, sec) => sum + sec.items.filter((i) => i.itemType === "LIKERT").length,
              0,
            );
            const directTriadCount = assessment.sections.reduce(
              (sum, sec) => sum + sec.triadGroups.length,
              0,
            );

            const totalItems = mcqCount + poolCount + directLikertCount + directTriadCount;

            // ── Collect unique attributes & competencies from all items ──────
            // attrMap: attributeId → { code, name, competencies[] }
            const attrMap = new Map<string, { code: string; name: string; competencies: string[] }>();
            const compMap = new Map<string, string>(); // competencyId → name

            function absorbAttr(
              attr: { id: string; code: string; name: string; competencyMaps: { competency: { id: string; name: string } }[] } | null,
            ) {
              if (!attr) return;
              const compNames = attr.competencyMaps.map((m) => {
                compMap.set(m.competency.id, m.competency.name);
                return m.competency.name;
              });
              const existing = attrMap.get(attr.id);
              if (existing) {
                for (const c of compNames) {
                  if (!existing.competencies.includes(c)) existing.competencies.push(c);
                }
              } else {
                attrMap.set(attr.id, { code: attr.code, name: attr.name, competencies: compNames });
              }
            }

            // From pool composition items
            for (const ci of assessment.compositionItems) {
              if (ci.sourceItem) absorbAttr(ci.sourceItem.attribute);
              if (ci.sourceTriad) {
                ci.sourceTriad.statements.forEach((s) => absorbAttr(s.attribute));
              }
            }

            // From direct section items
            for (const sec of assessment.sections) {
              sec.items.forEach((item) => absorbAttr(item.attribute));
              sec.triadGroups.forEach((g) =>
                g.statements.forEach((s) => absorbAttr(s.attribute)),
              );
            }

            const attrs = Array.from(attrMap.values()).sort((a, b) =>
              a.code.localeCompare(b.code),
            );
            const comps = Array.from(compMap.values()).sort();
            const statusCls = STATUS_STYLES[assessment.lifecycleStatus] ?? STATUS_STYLES.draft;

            return (
              <div
                key={assessment.id}
                className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden"
              >
                {/* Header row */}
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between border-b border-[#F1F5F9]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-[#0F172A]">{assessment.title}</p>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusCls}`}>
                        {assessment.lifecycleStatus}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                      <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 font-medium text-[#475569]">
                        {TYPE_LABELS[assessment.assessmentType] ?? assessment.assessmentType}
                      </span>
                      {assessment.tenant?.name && (
                        <span className="text-[#94A3B8]">· {assessment.tenant.name}</span>
                      )}
                      <span className="text-[#94A3B8]">· {assessment.durationMinutes} min</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Link
                      href={`/admin/assessments/${assessment.id}/builder`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#EFF6FF] transition"
                    >
                      Open Builder →
                    </Link>
                  </div>
                </div>

                {/* Stats + coverage */}
                <div className="divide-y divide-[#F1F5F9]">
                  {/* Question count row */}
                  <div className="px-5 py-3">
                    <div className="flex items-baseline gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Questions</p>
                        <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{totalItems}</p>
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        {mcqCount > 0 && `${mcqCount} MCQ · `}
                        {directLikertCount > 0 && `${directLikertCount} Likert · `}
                        {directTriadCount > 0 && `${directTriadCount} Triad · `}
                        {poolCount > 0 && `${poolCount} pool`}
                        {totalItems === 0 && "None added yet"}
                      </p>
                    </div>
                  </div>

                  {/* Attribute → Competency coverage */}
                  <div className="px-5 py-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                      Attribute → Competency coverage ({attrs.length} attributes · {comps.length} competencies)
                    </p>
                    {attrs.length === 0 ? (
                      <p className="text-[11px] text-[#94A3B8]">None mapped yet — link questions to attributes in the Question Bank.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {attrs.map((a) => (
                          <div
                            key={a.code}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1"
                            title={a.name}
                          >
                            {/* Attribute code + name */}
                            <span className="rounded border border-[#D1FAE5] bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#2563EB]">
                              {a.code}
                            </span>
                            <span className="text-[10px] text-[#475569]">{a.name}</span>
                            {/* Arrow + competencies */}
                            {a.competencies.length > 0 && (
                              <>
                                <span className="text-[10px] text-[#94A3B8]">→</span>
                                {a.competencies.map((c) => (
                                  <span
                                    key={c}
                                    className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </>
                            )}
                            {a.competencies.length === 0 && (
                              <span className="text-[10px] italic text-[#CBD5E1]">no competency</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

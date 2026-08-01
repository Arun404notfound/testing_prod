import type { AttemptResponseRow, SubmissionsData } from "@/lib/get-submissions";

const LIKERT_LABELS: Record<number, string> = { 1: "Not like me", 2: "Less like me", 3: "Somewhat like me", 4: "Almost like me", 5: "Just like me" };

function SkippedBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
      Skipped
    </span>
  );
}

// Normalised question shapes built from whatever mix of direct/composition items the assessment uses
type LikertRow = { id: string; prompt: string; factor: string | null };
type TriadRow = { id: string; title: string };

export function SubmissionsView({ data }: { data: SubmissionsData }) {
  const { result, attempt } = data;
  const mcqResponses = result.questionResponses;
  const attemptResponses: AttemptResponseRow[] = attempt?.responses ?? [];

  const likertResponses = attemptResponses.filter((r) => r.item?.itemType === "LIKERT");
  const triadResponses = attemptResponses.filter((r) => r.triadGroupId);

  // ── Build full question lists (direct + composition items merged) ──────────
  const assessment = result.assessment;

  // Likert: direct items + composition sourceItems (deduplicated by id)
  const likertMap = new Map<string, LikertRow>();
  for (const item of assessment?.items ?? []) {
    if (item.itemType === "LIKERT") {
      likertMap.set(item.id, { id: item.id, prompt: item.prompt, factor: item.factor ?? null });
    }
  }
  for (const comp of assessment?.compositionItems ?? []) {
    if (comp.sourceItem?.itemType === "LIKERT") {
      const s = comp.sourceItem;
      if (!likertMap.has(s.id)) {
        likertMap.set(s.id, { id: s.id, prompt: s.prompt, factor: s.factor ?? null });
      }
    }
  }
  const allLikertItems: LikertRow[] = [...likertMap.values()];

  // Triads: direct groups + composition sourceTriads (deduplicated by id)
  const triadMap = new Map<string, TriadRow>();
  for (const group of assessment?.triadGroups ?? []) {
    triadMap.set(group.id, { id: group.id, title: group.title });
  }
  for (const comp of assessment?.compositionItems ?? []) {
    if (comp.sourceTriad) {
      const s = comp.sourceTriad;
      if (!triadMap.has(s.id)) {
        triadMap.set(s.id, { id: s.id, title: s.title });
      }
    }
  }
  const allTriads: TriadRow[] = [...triadMap.values()];

  const allMcqQuestions = assessment?.questions ?? [];

  // Answered ID sets for skip detection
  const answeredMcqIds = new Set(mcqResponses.map((r) => r.questionId));
  const answeredItemIds = new Set(likertResponses.map((r) => r.itemId).filter((id): id is string => Boolean(id)));
  const answeredTriadIds = new Set(triadResponses.map((r) => r.triadGroupId).filter((id): id is string => Boolean(id)));

  // Fall back to legacy "show answered only" if we have no full list but DO have responses
  const hasFullLists = allLikertItems.length > 0 || allTriads.length > 0 || allMcqQuestions.length > 0;
  const hasAnswered = mcqResponses.length > 0 || likertResponses.length > 0 || triadResponses.length > 0;
  const hasAny = hasFullLists || hasAnswered;

  return (
    <div className="space-y-8">
      {/* MCQ */}
      {(allMcqQuestions.length > 0 ? allMcqQuestions : mcqResponses.map((r) => ({ question: { id: r.questionId, ...r.question } }))).length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-semibold text-[#0F172A]">
            MCQ Responses ({allMcqQuestions.length > 0 ? allMcqQuestions.length : mcqResponses.length})
          </h2>
          <div className="space-y-3">
            {(allMcqQuestions.length > 0 ? allMcqQuestions : mcqResponses.map((r) => ({ question: { id: r.questionId, ...r.question } }))).map(({ question }, i) => {
              const response = mcqResponses.find((r) => r.questionId === question.id);
              const isSkipped = allMcqQuestions.length > 0 && !answeredMcqIds.has(question.id);

              if (isSkipped) {
                return (
                  <div key={question.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-[#0F172A]">
                        <span className="mr-2 text-[#94A3B8]">Q{i + 1}.</span>
                        {question.questionText}
                      </p>
                      <SkippedBadge />
                    </div>
                  </div>
                );
              }

              if (!response) return null;
              const opts = [question.option1, question.option2, question.option3, question.option4];
              const selected = (response.selectedOption ?? 0) - 1;
              const correct = question.correctOption - 1;
              return (
                <div key={question.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                  <p className="mb-3 text-sm font-medium text-[#0F172A]">
                    <span className="mr-2 text-[#94A3B8]">Q{i + 1}.</span>
                    {question.questionText}
                  </p>
                  <div className="space-y-1.5">
                    {opts.map((opt, idx) => {
                      const isSelected = idx === selected;
                      const isCorrect = idx === correct;
                      let cls = "rounded-lg border px-3 py-2 text-sm ";
                      if (isSelected && isCorrect) cls += "border-emerald-300 bg-emerald-50 text-emerald-800";
                      else if (isSelected && !isCorrect) cls += "border-rose-300 bg-rose-50 text-rose-800";
                      else if (!isSelected && isCorrect) cls += "border-emerald-200 bg-emerald-50/50 text-emerald-700";
                      else cls += "border-[#E2E8F0] text-[#475569]";
                      return (
                        <div key={idx} className={cls}>
                          <span className="mr-2 font-medium">{String.fromCharCode(65 + idx)}.</span>
                          {opt}
                          {isSelected && <span className="ml-2 text-xs font-semibold">{isCorrect ? "✓ Your answer (Correct)" : "✗ Your answer"}</span>}
                          {!isSelected && isCorrect && <span className="ml-2 text-xs font-semibold text-emerald-600">✓ Correct answer</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Likert */}
      {(allLikertItems.length > 0 || likertResponses.length > 0) && (
        <section>
          <h2 className="mb-4 text-base font-semibold text-[#0F172A]">
            Likert Responses ({allLikertItems.length > 0 ? allLikertItems.length : likertResponses.length})
          </h2>
          <div className="space-y-3">
            {(allLikertItems.length > 0
              ? allLikertItems
              : likertResponses.map((r) => ({ id: r.itemId ?? r.id, prompt: r.item?.prompt ?? "—", factor: r.item?.factor ?? null }))
            ).map((item, i) => {
              const response = likertResponses.find((r) => r.itemId === item.id);
              const isSkipped = allLikertItems.length > 0 && !answeredItemIds.has(item.id);

              if (isSkipped) {
                return (
                  <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">
                          <span className="mr-2 text-[#94A3B8]">Q{i + 1}.</span>
                          {item.prompt}
                        </p>
                        {item.factor && (
                          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{item.factor}</p>
                        )}
                      </div>
                      <SkippedBadge />
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                  <p className="mb-2 text-sm font-medium text-[#0F172A]">
                    <span className="mr-2 text-[#94A3B8]">Q{i + 1}.</span>
                    {item.prompt}
                  </p>
                  {item.factor && (
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{item.factor}</p>
                  )}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((v) => {
                      const isSelected = response?.numericValue === v;
                      return (
                        <div
                          key={v}
                          className={`flex flex-1 flex-col items-center rounded-lg border py-2 text-xs ${
                            isSelected
                              ? "border-[#2563EB] bg-[#EFF6FF] font-bold text-[#2563EB]"
                              : "border-[#E2E8F0] text-[#94A3B8]"
                          }`}
                        >
                          <span className="text-sm font-semibold">{v}</span>
                          <span className="mt-0.5 hidden text-center text-[10px] leading-tight sm:block">{LIKERT_LABELS[v]}</span>
                          {isSelected && (
                            <span className="mt-0.5 text-center text-[10px] leading-tight sm:hidden">{LIKERT_LABELS[v]}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Triad */}
      {(allTriads.length > 0 || triadResponses.length > 0) && (
        <section>
          <h2 className="mb-4 text-base font-semibold text-[#0F172A]">
            Forced-Choice Responses ({allTriads.length > 0 ? allTriads.length : triadResponses.length})
          </h2>
          <div className="space-y-3">
            {(allTriads.length > 0
              ? allTriads
              : triadResponses.map((r) => ({ id: r.triadGroupId ?? r.id, title: r.triadGroup?.title ?? "Triad group" }))
            ).map((group, i) => {
              const response = triadResponses.find((r) => r.triadGroupId === group.id);
              const isSkipped = allTriads.length > 0 && !answeredTriadIds.has(group.id);

              if (isSkipped) {
                return (
                  <div key={group.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        <span className="mr-2 text-[#94A3B8]">Q{i + 1}.</span>
                        {group.title}
                      </p>
                      <SkippedBadge />
                    </div>
                  </div>
                );
              }

              return (
                <div key={group.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <span className="mr-2 text-[#94A3B8]">Q{i + 1}.</span>
                    {group.title}
                  </p>
                  <div className="space-y-2">
                    {response?.triadMostStatement && (
                      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        <span className="mt-0.5 shrink-0 rounded-full bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">MOST</span>
                        <span>{response.triadMostStatement.statementText}</span>
                      </div>
                    )}
                    {response?.triadLeastStatement && (
                      <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                        <span className="mt-0.5 shrink-0 rounded-full bg-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">LEAST</span>
                        <span>{response.triadLeastStatement.statementText}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!hasAny && (
        <p className="text-sm text-slate-500">No response data found for this submission.</p>
      )}
    </div>
  );
}

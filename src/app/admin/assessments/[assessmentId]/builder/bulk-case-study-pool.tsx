"use client";

import { useState } from "react";
import { addCaseStudyFromPoolBulk } from "./actions";

type AttrInfo = { code: string; category?: string | null; competencies: string[] };

type SubQuestion = { id: string; prompt: string; trait: string | null };

type CaseStudyGroup = {
  id: string;
  title: string;
  passageText: string;
  section: { title: string } | null;
  subQuestions: SubQuestion[];
};

export function BulkCaseStudyPool({
  assessmentId,
  caseStudies,
  selectedIdList,
  compositionIdMap,
  attrByNameEntries,
}: {
  assessmentId: string;
  caseStudies: CaseStudyGroup[];
  selectedIdList: string[];
  compositionIdMap: [string, string][];
  attrByNameEntries: [string, AttrInfo][];
}) {
  const selectedIds = new Set(selectedIdList);
  const attrByName = new Map(attrByNameEntries);
  const allIds = caseStudies.map((cs) => cs.id);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const addableIds = allIds.filter((id) => !selectedIds.has(id));
  const allChecked = addableIds.length > 0 && addableIds.every((id) => checked.has(id));
  const newlyChecked = [...checked].filter((id) => !selectedIds.has(id));

  function toggleAll() {
    if (allChecked) setChecked(new Set());
    else setChecked(new Set(addableIds));
  }

  function toggleOne(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleBulkAdd(formData: FormData) {
    await addCaseStudyFromPoolBulk(assessmentId, formData);
    setChecked(new Set());
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-slate-300 accent-[#2563EB]"
          />
          Select all ({addableIds.length} not added)
        </label>
        {newlyChecked.length > 0 && (
          <form action={handleBulkAdd}>
            {newlyChecked.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
            <button type="submit" className="rounded-md bg-[#2563EB] px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
              Add {newlyChecked.length} selected
            </button>
          </form>
        )}
      </div>

      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
        {caseStudies.map((cs) => {
          const isAdded = selectedIds.has(cs.id);
          const isChecked = checked.has(cs.id);
          return (
            <li key={cs.id} className={`flex items-start gap-3 p-3 ${isAdded ? "bg-slate-50 opacity-70" : isChecked ? "bg-teal-50" : ""}`}>
              <input
                type="checkbox"
                checked={isAdded ? true : isChecked}
                disabled={isAdded}
                onChange={() => toggleOne(cs.id)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {cs.section?.title ?? "Question Pool"}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#0F172A]">{cs.title}</p>
                  <span className="rounded border border-fuchsia-200 bg-fuchsia-50 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-700">
                    {cs.subQuestions.length} questions
                  </span>
                  {isAdded && (
                    <span className="rounded border border-slate-300 bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">✓ Added</span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{cs.passageText}</p>
                <div className="mt-2 space-y-1.5">
                  {cs.subQuestions.map((sq, si) => {
                    const sAttrInfo = sq.trait ? attrByName.get(sq.trait.toLowerCase()) : undefined;
                    return (
                      <div key={sq.id} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                          {si + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-[#0F172A]">{sq.prompt}</p>
                          {sAttrInfo ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded border border-[#D1FAE5] bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#2563EB]">
                              [{sAttrInfo.code}] {sq.trait}
                            </span>
                          ) : sq.trait ? (
                            <span className="mt-1 inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                              {sq.trait} <span className="ml-1 opacity-60">(no mapping)</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
        {caseStudies.length === 0 && <li className="p-4 text-sm text-slate-500">No case studies match filters.</li>}
      </ul>
    </div>
  );
}

"use client";

import { useState } from "react";
import { addTriadFromPoolBulk } from "./actions";

type AttrInfo = { code: string; category?: string | null; competencies: string[] };

type TriadStatement = { id: string; statementText: string; trait: string | null; polarity: string | null };

type TriadGroup = {
  id: string;
  title: string;
  triadGroupCode: string | null;
  section: { title: string };
  statements: TriadStatement[];
};

export function BulkTriadPool({
  assessmentId,
  groups,
  selectedIdList,
  compositionIdMap,
  attrByNameEntries,
}: {
  assessmentId: string;
  groups: TriadGroup[];
  selectedIdList: string[];
  compositionIdMap: [string, string][];
  attrByNameEntries: [string, AttrInfo][];
}) {
  const selectedIds = new Set(selectedIdList);
  const attrByName = new Map(attrByNameEntries);
  const allIds = groups.map((g) => g.id);
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
    await addTriadFromPoolBulk(assessmentId, formData);
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
            className="h-4 w-4 rounded border-slate-300 accent-[#1D4ED8]"
          />
          Select all ({groups.length - selectedIds.size} not added)
        </label>
        {newlyChecked.length > 0 && (
          <form action={handleBulkAdd}>
            {newlyChecked.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
            <button type="submit" className="rounded-md bg-[#1D4ED8] px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
              Add {newlyChecked.length} selected
            </button>
          </form>
        )}
      </div>

      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
        {groups.map((g) => {
          const isAdded = selectedIds.has(g.id);
          const isChecked = checked.has(g.id);
          const groupComps: string[] = [];
          for (const s of g.statements) {
            const info = s.trait ? attrByName.get(s.trait.toLowerCase()) : undefined;
            if (info) for (const c of info.competencies) if (!groupComps.includes(c)) groupComps.push(c);
          }

          const groupPolarity = g.statements[0]?.polarity ?? null;

          return (
            <li key={g.id} className={`flex items-start gap-3 p-3 ${isChecked ? "bg-blue-50" : ""}`}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleOne(g.id)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#1D4ED8]"
              />
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {g.section?.title ?? "Question Pool"}{g.triadGroupCode ? ` · ${g.triadGroupCode}` : ""}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#0F172A]">{g.title}</p>
                  {groupPolarity === "POSITIVE" && (
                    <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">POSITIVE</span>
                  )}
                  {groupPolarity === "NEGATIVE" && (
                    <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">NEGATIVE</span>
                  )}
                </div>
                {groupComps.length > 0 && (
                  <div className="mt-1 mb-2 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-medium text-slate-400 mr-0.5">Competencies:</span>
                    {groupComps.map((c) => (
                      <span key={c} className="inline-flex items-center rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">{c}</span>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {g.statements.map((s, si) => {
                    const label = ["A", "B", "C"][si] ?? String(si + 1);
                    const sAttrInfo = s.trait ? attrByName.get(s.trait.toLowerCase()) : undefined;
                    return (
                      <div key={s.id} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{label}</span>
                        <div className="min-w-0">
                          <p className="text-sm text-[#0F172A]">{s.statementText}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {sAttrInfo ? (
                              <>
                                <span className="inline-flex items-center gap-1 rounded border border-[#DBEAFE] bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#1D4ED8]">
                                  [{sAttrInfo.code}] {s.trait}
                                </span>
                                {sAttrInfo.competencies.map((c) => (
                                  <span key={c} className="inline-flex items-center rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">{c}</span>
                                ))}
                              </>
                            ) : s.trait ? (
                              <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                                {s.trait} <span className="ml-1 opacity-60">(no mapping)</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
        {groups.length === 0 && <li className="p-4 text-sm text-slate-500">No triad groups match filters.</li>}
      </ul>
    </div>
  );
}

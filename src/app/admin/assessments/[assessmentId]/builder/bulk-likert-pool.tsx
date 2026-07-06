"use client";

import { useState } from "react";
import { addLikertFromPoolBulk } from "./actions";

type AttrInfo = { code: string; category?: string | null; competencies: string[] };

type LikertItem = {
  id: string;
  factor: string | null;
  polarity: string | null;
  prompt: string;
  trait: string | null;
};

export function BulkLikertPool({
  assessmentId,
  items,
  selectedIdList,
  compositionIdMap,
  attrByNameEntries,
}: {
  assessmentId: string;
  items: LikertItem[];
  selectedIdList: string[];
  compositionIdMap: [string, string][];
  attrByNameEntries: [string, AttrInfo][];
}) {
  const selectedIds = new Set(selectedIdList);
  const attrByName = new Map(attrByNameEntries);
  const allIds = items.map((i) => i.id);
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
    await addLikertFromPoolBulk(assessmentId, formData);
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
        {items.map((item) => {
          const attrInfo = item.trait ? attrByName.get(item.trait.toLowerCase()) : undefined;
          const isAdded = selectedIds.has(item.id);
          const isChecked = checked.has(item.id);
          return (
            <li key={item.id} className={`flex items-start gap-3 p-3 ${isAdded ? "bg-slate-50 opacity-70" : isChecked ? "bg-teal-50" : ""}`}>
              <input
                type="checkbox"
                checked={isAdded ? true : isChecked}
                disabled={isAdded}
                onChange={() => toggleOne(item.id)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{item.factor}</p>
                  {item.polarity === "POSITIVE" && (
                    <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">POSITIVE</span>
                  )}
                  {item.polarity === "NEGATIVE" && (
                    <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">NEGATIVE</span>
                  )}
                  {isAdded && (
                    <span className="rounded border border-slate-300 bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">✓ Added</span>
                  )}
                </div>
                <p className="text-sm text-[#0F172A]">{item.prompt}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {attrInfo ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded border border-[#D1FAE5] bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
                        [{attrInfo.code}] {item.trait}
                      </span>
                      {attrInfo.competencies.map((c) => (
                        <span key={c} className="inline-flex items-center rounded border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">{c}</span>
                      ))}
                    </>
                  ) : item.trait ? (
                    <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                      {item.trait} <span className="ml-1 opacity-60">(no mapping)</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
        {items.length === 0 && <li className="p-4 text-sm text-slate-500">No Likert items match filters.</li>}
      </ul>
    </div>
  );
}

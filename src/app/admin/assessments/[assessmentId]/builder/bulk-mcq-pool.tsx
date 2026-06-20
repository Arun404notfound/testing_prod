"use client";

import { useState } from "react";
import { addMcqQuestionsBulk } from "./actions";

type McqItem = {
  id: string;
  section: string | null;
  category: string | null;
  questionText: string;
};

export function BulkMcqPool({
  assessmentId,
  items,
  selectedIdList,
}: {
  assessmentId: string;
  items: McqItem[];
  selectedIdList: string[];
}) {
  const selectedIds = new Set(selectedIdList);
  const allIds = items.map((q) => q.id);
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
    await addMcqQuestionsBulk(assessmentId, formData);
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
          Select all ({items.length - selectedIds.size} not added)
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
        {items.map((q) => {
          const isAdded = selectedIds.has(q.id);
          const isChecked = checked.has(q.id);
          return (
            <li key={q.id} className={`flex items-center gap-3 p-3 ${isChecked ? "bg-teal-50" : ""}`}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleOne(q.id)}
                className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[#2563EB]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">{q.section} · {q.category}</p>
                <p className="text-sm text-[#0F172A]">{q.questionText}</p>
              </div>
            </li>
          );
        })}
        {items.length === 0 && <li className="p-4 text-sm text-slate-500">No questions match filters.</li>}
      </ul>
    </div>
  );
}

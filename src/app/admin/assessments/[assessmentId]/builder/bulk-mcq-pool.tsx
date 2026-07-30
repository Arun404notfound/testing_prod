"use client";

import { useState } from "react";
import { addMcqQuestionsBulk } from "./actions";

type McqQuestionRow = {
  id: string;
  section: string;
  category: string;
  questionText: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctOption: number;
};

export function BulkMcqPool({
  assessmentId,
  questions,
  selectedIdList,
}: {
  assessmentId: string;
  questions: McqQuestionRow[];
  selectedIdList: string[];
}) {
  const selectedIds = new Set(selectedIdList);
  const allIds = questions.map((q) => q.id);
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
            className="h-4 w-4 rounded border-slate-300 accent-amber-600"
          />
          Select all ({addableIds.length} not added)
        </label>
        {newlyChecked.length > 0 && (
          <form action={handleBulkAdd}>
            {newlyChecked.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
            <button type="submit" className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700">
              Add {newlyChecked.length} selected
            </button>
          </form>
        )}
      </div>

      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
        {questions.map((q) => {
          const options = [q.option1, q.option2, q.option3, q.option4];
          const isAdded = selectedIds.has(q.id);
          const isChecked = checked.has(q.id);
          return (
            <li key={q.id} className={`flex items-start gap-3 p-3 ${isAdded ? "bg-slate-50 opacity-70" : isChecked ? "bg-amber-50" : ""}`}>
              <input
                type="checkbox"
                checked={isAdded ? true : isChecked}
                disabled={isAdded}
                onChange={() => toggleOne(q.id)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{q.section}</p>
                  <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{q.category}</span>
                  {isAdded && (
                    <span className="rounded border border-slate-300 bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">✓ Added</span>
                  )}
                </div>
                <p className="text-sm text-[#0F172A]">{q.questionText}</p>
                <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                  {options.map((opt, oi) => (
                    <p key={oi} className={`flex items-start gap-1.5 text-xs ${oi + 1 === q.correctOption ? "font-semibold text-emerald-700" : "text-[#475569]"}`}>
                      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${oi + 1 === q.correctOption ? "bg-emerald-100 text-emerald-700" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      {opt}
                    </p>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
        {questions.length === 0 && <li className="p-4 text-sm text-slate-500">No MCQ questions match filters.</li>}
      </ul>
    </div>
  );
}

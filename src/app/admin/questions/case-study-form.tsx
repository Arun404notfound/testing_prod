"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";

const inputCls = "w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none";

type Attribute = { id: string; code: string; name: string };

/**
 * Sub-questions start at one and grow via "Add sub-question" instead of a
 * fixed three — `subKeys` holds stable React keys (order never reused so
 * removing/re-adding doesn't collide), while the *array index* at render
 * time (not the key) drives the `sub_${i}_*` field names the server action
 * reads, so removing a middle sub-question still leaves the remaining ones
 * numbered contiguously from 0.
 */
export function CaseStudyForm({
  attributes,
  action,
}: {
  attributes: Attribute[];
  action: (formData: FormData) => void;
}) {
  const [subKeys, setSubKeys] = useState<number[]>([0]);
  const nextKey = useRef(1);

  function addSubQuestion() {
    setSubKeys((keys) => [...keys, nextKey.current++]);
  }

  function removeSubQuestion(key: number) {
    setSubKeys((keys) => (keys.length > 1 ? keys.filter((k) => k !== key) : keys));
  }

  return (
    <form action={action} className="space-y-5 p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#475569]">Case Study Title *</label>
        <input name="title" required placeholder="e.g. The Delayed Product Launch" className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#475569]">Passage *</label>
        <textarea name="passageText" required rows={6} placeholder="Write the case study passage the candidate will read…" className={`${inputCls} resize-y`} />
      </div>

      {subKeys.map((key, i) => (
        <div key={key} className="rounded-xl border border-[#E2E8F0] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-fuchsia-600 uppercase tracking-wide">Sub-question {i + 1}</p>
            {subKeys.length > 1 && (
              <button
                type="button"
                onClick={() => removeSubQuestion(key)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-rose-500 hover:bg-rose-50"
                title="Remove sub-question"
              >
                <X size={12} /> Remove
              </button>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#475569]">Question *</label>
            <input name={`sub_${i}_prompt`} required placeholder={`Question ${i + 1} about the passage…`} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#475569]">Attribute *</label>
            <select name={`sub_${i}_attributeId`} required defaultValue="" className={inputCls}>
              <option value="" disabled>Select attribute…</option>
              {attributes.map((a) => (
                <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n}>
                <label className="mb-1 block text-xs font-medium text-[#475569]">Option {n} *</label>
                <input name={`sub_${i}_option${n}`} required placeholder={`Option ${n}`} className={inputCls} />
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#475569]">Correct option *</label>
            <select name={`sub_${i}_correctOption`} required defaultValue="" className={inputCls}>
              <option value="" disabled>Select correct option…</option>
              <option value="1">Option 1</option>
              <option value="2">Option 2</option>
              <option value="3">Option 3</option>
              <option value="4">Option 4</option>
            </select>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addSubQuestion}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#CBD5E1] px-3.5 py-2 text-xs font-medium text-[#475569] transition hover:border-fuchsia-400 hover:text-fuchsia-600"
      >
        <Plus size={14} /> Add sub-question
      </button>

      <div className="flex justify-end gap-3 border-t border-[#F1F5F9] pt-4">
        <Link href="/admin/questions?tab=case_study" className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Cancel</Link>
        <button type="submit" className="rounded-lg bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700">
          Add Case Study
        </button>
      </div>
    </form>
  );
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { OptionImageField, QuestionAudioField, QuestionImagesField } from "@/components/admin/media-upload-fields";

const inputCls = "w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none";

type Attribute = { id: string; code: string; name: string };
type SubQuestionType = "MCQ" | "LIKERT" | "TRIAD";

const TYPE_LABEL: Record<SubQuestionType, string> = { MCQ: "MCQ", LIKERT: "Likert scale", TRIAD: "Triad (most/least)" };

function TypeTabs({ value, onChange }: { value: SubQuestionType; onChange: (t: SubQuestionType) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-[#E2E8F0] p-0.5">
      {(["MCQ", "LIKERT", "TRIAD"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
            value === t ? "bg-fuchsia-600 text-white" : "text-[#64748B] hover:bg-[#F8FAFC]"
          }`}
        >
          {TYPE_LABEL[t]}
        </button>
      ))}
    </div>
  );
}

/**
 * Sub-questions start at one and grow via "Add sub-question" instead of a
 * fixed three — `subs` holds stable React keys (order never reused so
 * removing/re-adding doesn't collide), while the *array index* at render
 * time (not the key) drives the `sub_${i}_*` field names the server action
 * reads, so removing a middle sub-question still leaves the remaining ones
 * numbered contiguously from 0. Each sub-question also carries its own
 * `type` (MCQ/Likert/Triad), which switches which fields render below —
 * the server action reads a matching hidden `sub_${i}_type` input.
 */
export function CaseStudyForm({
  attributes,
  action,
}: {
  attributes: Attribute[];
  action: (formData: FormData) => void;
}) {
  const [subs, setSubs] = useState<{ key: number; type: SubQuestionType }[]>([{ key: 0, type: "MCQ" }]);
  const nextKey = useRef(1);

  function addSubQuestion() {
    setSubs((prev) => [...prev, { key: nextKey.current++, type: "MCQ" }]);
  }

  function removeSubQuestion(key: number) {
    setSubs((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));
  }

  function setSubType(key: number, type: SubQuestionType) {
    setSubs((prev) => prev.map((s) => (s.key === key ? { ...s, type } : s)));
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

      {subs.map(({ key, type }, i) => (
        <div key={key} className="rounded-xl border border-[#E2E8F0] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-fuchsia-600 uppercase tracking-wide">Sub-question {i + 1}</p>
            <div className="flex items-center gap-2">
              <TypeTabs value={type} onChange={(t) => setSubType(key, t)} />
              {subs.length > 1 && (
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
          </div>
          <input type="hidden" name={`sub_${i}_type`} value={type} />
          <div>
            <label className="mb-1 block text-xs font-medium text-[#475569]">{type === "TRIAD" ? "Prompt *" : "Question *"}</label>
            <input
              name={`sub_${i}_prompt`}
              required
              placeholder={type === "TRIAD" ? `Prompt ${i + 1} — e.g. "Rank these responses to the situation"` : `Question ${i + 1} about the passage…`}
              className={inputCls}
            />
          </div>

          {type !== "TRIAD" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[#475569]">Attribute *</label>
              <select name={`sub_${i}_attributeId`} required defaultValue="" className={inputCls}>
                <option value="" disabled>Select attribute…</option>
                {attributes.map((a) => (
                  <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 grid gap-3 sm:grid-cols-2">
            <QuestionImagesField namePrefix={`sub_${i}_img`} max={3} />
            <QuestionAudioField name={`sub_${i}_audio`} />
          </div>

          {type === "MCQ" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="space-y-1.5">
                    <label className="mb-1 block text-xs font-medium text-[#475569]">Option {n} <span className="font-normal text-[#94A3B8]">(text and/or image)</span></label>
                    <input name={`sub_${i}_option${n}`} placeholder={`Option ${n}`} className={inputCls} />
                    <OptionImageField name={`sub_${i}_img_opt${n}`} />
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
            </>
          )}

          {type === "LIKERT" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#475569]">Scale min <span className="font-normal text-[#94A3B8]">(default 1)</span></label>
                <input name={`sub_${i}_minValue`} type="number" placeholder="1" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#475569]">Scale max <span className="font-normal text-[#94A3B8]">(default 5)</span></label>
                <input name={`sub_${i}_maxValue`} type="number" placeholder="5" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#475569]">Min label <span className="font-normal text-[#94A3B8]">(default &quot;Strongly Disagree&quot;)</span></label>
                <input name={`sub_${i}_minLabel`} placeholder="Strongly Disagree" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#475569]">Max label <span className="font-normal text-[#94A3B8]">(default &quot;Strongly Agree&quot;)</span></label>
                <input name={`sub_${i}_maxLabel`} placeholder="Strongly Agree" className={inputCls} />
              </div>
            </div>
          )}

          {type === "TRIAD" && (
            <div className="space-y-3">
              <p className="text-[11px] text-[#64748B]">Exactly three statements — the candidate picks which is most and least like their response.</p>
              {[0, 1, 2].map((j) => (
                <div key={j} className="rounded-lg border border-[#E2E8F0] p-3 space-y-2">
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Statement {j + 1} *</label>
                  <input name={`sub_${i}_stmt${j}_text`} required placeholder={`Statement ${j + 1}`} className={inputCls} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select name={`sub_${i}_stmt${j}_attributeId`} required defaultValue="" className={inputCls}>
                      <option value="" disabled>Select attribute…</option>
                      {attributes.map((a) => (
                        <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                      ))}
                    </select>
                    <select name={`sub_${i}_stmt${j}_polarity`} defaultValue="POSITIVE" className={inputCls}>
                      <option value="POSITIVE">Positive</option>
                      <option value="NEGATIVE">Negative</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
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

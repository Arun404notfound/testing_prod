"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";

export type QuestionTypeOption = { label: string; description?: string; href: string };

/**
 * Single top-right "Add Question" trigger, shared across the Psychometric/
 * Technical/Survey question pages — replaces each tab's own "+ Add New X"
 * button. Picking a type just navigates to that tab with its existing
 * `add<Type>=1` query param set, so the actual add-form (and its server
 * action) is unchanged — only how you get there moves.
 */
export function AddQuestionMenu({ options }: { options: QuestionTypeOption[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="tg-button-primary flex items-center gap-1.5 text-sm"
      >
        <Plus size={16} /> Add Question
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-lg">
          <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">Question type</p>
          {options.map((opt) => (
            <Link
              key={opt.href}
              href={opt.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2.5 py-2 text-sm transition hover:bg-[#F8FAFC]"
            >
              <span className="block font-medium text-[#334155]">{opt.label}</span>
              {opt.description && <span className="block text-[11px] text-[#94A3B8]">{opt.description}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

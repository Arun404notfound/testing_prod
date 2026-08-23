"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { deleteSkillFrameworkById } from "./actions";

export function SkillFrameworkBuilderHeaderActions({
  skillFrameworkId,
  skillFrameworkName,
}: {
  skillFrameworkId: string;
  skillFrameworkName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100 transition"
      >
        Delete
      </button>
      {open && (
        <DeleteSkillFrameworkModal skillFrameworkId={skillFrameworkId} skillFrameworkName={skillFrameworkName} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function DeleteSkillFrameworkModal({
  skillFrameworkId,
  skillFrameworkName,
  onClose,
}: {
  skillFrameworkId: string;
  skillFrameworkName: string;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const matches = typed === skillFrameworkName;

  async function handleDelete() {
    if (!matches) return;
    setPending(true);
    await deleteSkillFrameworkById(skillFrameworkId);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-skill-framework-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle size={18} />
            </span>
            <p id="delete-skill-framework-title" className="font-bold text-[#0F172A]">
              Delete Skill Framework
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-[#64748B] transition hover:bg-white/60 hover:text-[#0F172A]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-[#334155]">
            This permanently deletes <span className="font-semibold text-[#0F172A]">{skillFrameworkName}</span> along
            with all of its domains, competencies, sub-skill mappings and report content. Any assessment using
            this Skill Framework will fall back to its default report layout. This cannot be undone.
          </p>
          <label className="block text-sm text-[#334155]">
            <span className="mb-1.5 block">
              Type <span className="font-semibold text-[#0F172A]">{skillFrameworkName}</span> to confirm.
            </span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </label>

          <div className="flex items-center justify-end gap-2 border-t border-[#F1F5F9] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!matches || pending}
              onClick={handleDelete}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Deleting…" : "Delete this Skill Framework"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

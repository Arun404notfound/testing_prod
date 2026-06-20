"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteAssessmentById } from "./actions";

export function BuilderHeaderActions({
  assessmentId,
  assessmentTitle,
}: {
  assessmentId: string;
  assessmentTitle: string;
}) {
  const [delConfirm, setDelConfirm] = useState(false);
  const [delPending, setDelPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleDelete() {
    setDelPending(true);
    await deleteAssessmentById(assessmentId);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const assignHref = `/admin/assignments?assessmentId=${encodeURIComponent(assessmentId)}&assessmentTitle=${encodeURIComponent(assessmentTitle)}`;

  return (
    <>
      {/* Save toast */}
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800 shadow-lg transition-all">
          ✓ Your changes are saved
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition"
      >
        Save
      </button>

      <Link
        href={assignHref}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2563EB] bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4edb] transition"
      >
        Assign now →
      </Link>

      {!delConfirm ? (
        <button
          type="button"
          onClick={() => setDelConfirm(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100 transition"
        >
          Delete
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Are you sure?</span>
          <button
            type="button"
            disabled={delPending}
            onClick={handleDelete}
            className="rounded-md border border-rose-300 bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {delPending ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            onClick={() => setDelConfirm(false)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}

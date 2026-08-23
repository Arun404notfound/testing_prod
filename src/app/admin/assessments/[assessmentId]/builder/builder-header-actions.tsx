"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteAssessmentById } from "./actions";

export function BuilderHeaderActions({
  assessmentId,
  assessmentTitle,
  backToProgramHref,
}: {
  assessmentId: string;
  assessmentTitle: string;
  /** Set when this module belongs to a Program — assigning happens at the Program level, so "Assign now" is replaced with a "done, take me back" affordance instead. Null for standalone/legacy assessments, which keep the old direct-assign button. */
  backToProgramHref?: string | null;
}) {
  const [delConfirm, setDelConfirm] = useState(false);
  const [delPending, setDelPending] = useState(false);

  async function handleDelete() {
    setDelPending(true);
    await deleteAssessmentById(assessmentId);
  }

  const assignHref = `/admin/assignments?assessmentId=${encodeURIComponent(assessmentId)}&assessmentTitle=${encodeURIComponent(assessmentTitle)}`;

  return (
    <>
      {backToProgramHref ? (
        <Link
          href={backToProgramHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0F766E] bg-[#0F766E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0D9488] transition"
        >
          ✓ Done — Back to Program
        </Link>
      ) : (
        <Link
          href={assignHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2563EB] bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4edb] transition"
        >
          Assign now →
        </Link>
      )}

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

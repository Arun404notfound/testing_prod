"use client";

import { useState } from "react";

export type SelectedRow =
  | { kind: "mcq"; section: string; key: string; label: string }
  | { kind: "likert"; section: string; key: string; label: string }
  | { kind: "triad"; section: string; key: string; label: string }
  | { kind: "sjt"; section: string; key: string; label: string }
  | { kind: "case_study"; section: string; key: string; label: string };

export function SelectedContentList({
  rows,
  assessmentId,
  removeMcqQuestion,
  removeCompositionItem,
}: {
  rows: SelectedRow[];
  assessmentId: string;
  removeMcqQuestion: (assessmentId: string, questionId: string, formData: FormData) => Promise<void>;
  removeCompositionItem: (assessmentId: string, compositionItemId: string, formData: FormData) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded ? rows : rows.slice(0, 3);
  const hiddenCount = rows.length - 3;

  return (
    <>
      <ul className="space-y-2 text-sm text-[#334155]">
        {visibleRows.map((row) => (
          <li
            key={row.key}
            className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 md:flex-row md:items-start md:justify-between"
          >
            <div>
              <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase text-slate-600">
                {row.kind}
              </span>
              <span>{row.label}</span>
            </div>
            <div className="shrink-0">
              {row.kind === "mcq" ? (
                <form action={removeMcqQuestion.bind(null, assessmentId, row.key.replace("mcq-", ""))}>
                  <button type="submit" className="text-sm font-medium text-rose-600 hover:underline">
                    Remove
                  </button>
                </form>
              ) : (
                <form action={removeCompositionItem.bind(null, assessmentId, row.key.replace("comp-", ""))}>
                  <button type="submit" className="text-sm font-medium text-rose-600 hover:underline">
                    Remove
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-semibold text-[#2563EB] hover:underline"
        >
          {expanded ? "Show less ↑" : `View all (${hiddenCount} more) →`}
        </button>
      )}
    </>
  );
}

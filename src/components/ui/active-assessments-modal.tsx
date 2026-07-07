"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardList, X } from "lucide-react";
import { QuickAssignState } from "@/app/admin/assignments/quick-assign-action";

export type ActiveAssessmentSummary = {
  id: string;
  title: string;
  assessmentType: string;
  durationMinutes: number;
};

export type AssignableCandidate = { id: string; fullName: string; email: string };

type QuickAssignAction = (prevState: QuickAssignState, formData: FormData) => Promise<QuickAssignState>;

export function ActiveAssessmentsModal({
  open,
  onClose,
  assessments,
  candidates,
  batches,
  quickAssignAction,
}: {
  open: boolean;
  onClose: () => void;
  assessments: ActiveAssessmentSummary[];
  candidates: AssignableCandidate[];
  batches: string[];
  quickAssignAction: QuickAssignAction;
}) {
  const [openKey, setOpenKey] = useState(0);

  useEffect(() => {
    if (open) setOpenKey((k) => k + 1);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-assessments-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <ModalBody
        key={openKey}
        onClose={onClose}
        assessments={assessments}
        candidates={candidates}
        batches={batches}
        quickAssignAction={quickAssignAction}
      />
    </div>
  );
}

function ModalBody({
  onClose,
  assessments,
  candidates,
  batches,
  quickAssignAction,
}: {
  onClose: () => void;
  assessments: ActiveAssessmentSummary[];
  candidates: AssignableCandidate[];
  batches: string[];
  quickAssignAction: QuickAssignAction;
}) {
  const [selected, setSelected] = useState<ActiveAssessmentSummary | null>(null);

  if (selected) {
    return (
      <AssignPanel
        key={selected.id}
        assessment={selected}
        candidates={candidates}
        batches={batches}
        quickAssignAction={quickAssignAction}
        onBack={() => setSelected(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DBEAFE] text-[#1D4ED8]">
            <ClipboardList size={18} />
          </span>
          <div>
            <p id="active-assessments-title" className="font-bold text-[#0F172A]">
              Active Assessments
            </p>
            <p className="text-xs text-[#64748B]">Pick one to assign to candidates</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-2 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {assessments.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-[#64748B]">No published assessments yet.</p>
        ) : (
          <ul className="space-y-2">
            {assessments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] px-4 py-3 transition hover:border-[#BFDBFE] hover:bg-[#F8FAFC]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0F172A]">{a.title}</p>
                  <p className="mt-0.5 text-xs text-[#64748B]">
                    {a.assessmentType.replaceAll("_", " ")} · {a.durationMinutes} min
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(a)}
                  className="shrink-0 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1d4edb]"
                >
                  Assign
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AssignPanel({
  assessment,
  candidates,
  batches,
  quickAssignAction,
  onBack,
  onClose,
}: {
  assessment: ActiveAssessmentSummary;
  candidates: AssignableCandidate[];
  batches: string[];
  quickAssignAction: QuickAssignAction;
  onBack: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"individual" | "batch">("individual");
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [state, formAction, isPending] = useActionState<QuickAssignState, FormData>(quickAssignAction, {
    status: "idle",
  });

  const hasBatches = batches.length > 0;

  function toggleBatch(name: string) {
    setSelectedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
        <div className="flex items-center gap-3">
          {state.status === "success" ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DBEAFE] text-[#1D4ED8]">
              <ClipboardList size={18} />
            </span>
          ) : (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to list"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <p id="active-assessments-title" className="font-bold text-[#0F172A]">
              {assessment.title}
            </p>
            <p className="text-xs text-[#64748B]">
              {state.status === "success" ? "Assignment complete" : "Choose who to assign this to"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-2 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {state.status === "success" ? (
          <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={26} />
            </span>
            <p className="text-sm font-medium text-[#0F172A]">{state.message}</p>
            <Link
              href="/admin/assignments#all-assignments"
              onClick={onClose}
              className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4edb]"
            >
              See Assignment Status →
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4 px-1 pb-2">
            <input type="hidden" name="assessmentId" value={assessment.id} />
            <input type="hidden" name="mode" value={mode} />

            {state.status === "error" && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {state.message}
              </div>
            )}

            <div className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 gap-1">
              <button
                type="button"
                onClick={() => setMode("individual")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === "individual" ? "bg-[#2563EB] text-white shadow-sm" : "text-[#64748B] hover:text-[#334155]"
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setMode("batch")}
                disabled={!hasBatches}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === "batch"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#334155] disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                Batch
                {!hasBatches && <span className="ml-1.5 text-[10px] font-normal opacity-70">(none yet)</span>}
              </button>
            </div>

            {mode === "individual" ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#475569]">Candidate *</label>
                <select
                  name="candidateId"
                  required
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="">Select candidate…</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-xs font-medium text-[#475569]">
                  Batches * <span className="ml-1 font-normal text-violet-600">({selectedBatches.size} selected)</span>
                </p>
                <div className="space-y-2 rounded-lg border border-violet-200 p-3 max-h-36 overflow-y-auto">
                  {batches.map((b) => {
                    const checked = selectedBatches.has(b);
                    return (
                      <label key={b} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-violet-50 transition">
                        <input
                          type="checkbox"
                          name="batchName"
                          value={b}
                          checked={checked}
                          onChange={() => toggleBatch(b)}
                          className="h-4 w-4 rounded border-violet-300 accent-violet-600"
                        />
                        <span className="text-sm font-medium text-[#334155]">{b}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#475569]">
                  Deadline <span className="font-normal text-[#94A3B8]">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  name="expiresAt"
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#475569]">
                  Duration <span className="font-normal text-[#94A3B8]">(minutes, optional)</span>
                </label>
                <input
                  type="number"
                  name="durationMinutes"
                  min="1"
                  max="480"
                  placeholder="e.g. 45"
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-[#F1F5F9] pt-4">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1d4edb] disabled:opacity-50 transition"
              >
                {isPending ? "Assigning…" : "Assign"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

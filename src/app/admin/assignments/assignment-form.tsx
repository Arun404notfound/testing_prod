"use client";

import { useState } from "react";

type Candidate = { id: string; fullName: string; email: string };
type Assessment = { id: string; title: string };

export function AssignmentForm({
  candidates,
  assessments,
  batches,
  defaultAssessmentId,
  defaultBatchName,
  createAssignment,
  bulkAssignBatch,
}: {
  candidates: Candidate[];
  assessments: Assessment[];
  batches: string[];
  defaultAssessmentId?: string;
  defaultBatchName?: string;
  createAssignment: (formData: FormData) => Promise<void>;
  bulkAssignBatch: (formData: FormData) => Promise<void>;
}) {
  const hasBatches = batches.length > 0;
  const defaultType = defaultBatchName && hasBatches ? "batch" : "individual";
  const [type, setType] = useState<"individual" | "batch">(defaultType);
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(
    defaultBatchName ? new Set([defaultBatchName]) : new Set()
  );

  function toggleBatch(name: string) {
    setSelectedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (assessments.length === 0) {
    return (
      <div id="new-assignment" className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
        <div className="border-b border-amber-200 bg-amber-100 px-5 py-4 flex items-center gap-2">
          <span className="text-amber-600 text-base">⚠</span>
          <p className="text-sm font-semibold text-amber-800">No assessments ready to assign</p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-amber-700">
            An assessment must be <strong>published</strong> and have <strong>at least one question added via the builder</strong> before it can be assigned. To get started:
          </p>
          <ol className="space-y-2 text-sm text-amber-800">
            <li className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-800">1</span> Go to <strong>Assessments</strong> and open an existing assessment (or create one).</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-800">2</span> Click <strong>Open Builder</strong> and add questions from the question pool.</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-800">3</span> Make sure the assessment status is set to <strong>Published</strong>.</li>
          </ol>
          <a
            href="/admin/assessments"
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4edb] transition"
          >
            Go to Assessments →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div id="new-assignment" className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4">
        <p className="text-sm font-semibold text-[#0F172A]">New Assignment</p>
        <p className="mt-0.5 text-xs text-[#64748B]">Only published assessments with questions appear in the list below.</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Type toggle */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#475569]">Assignment type</p>
          <div className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 gap-1">
            <button
              type="button"
              onClick={() => setType("individual")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                type === "individual"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-[#64748B] hover:text-[#334155]"
              }`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setType("batch")}
              disabled={!hasBatches}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                type === "batch"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-[#64748B] hover:text-[#334155] disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              Batch
              {!hasBatches && <span className="ml-1.5 text-[10px] font-normal opacity-70">(no batches yet)</span>}
            </button>
          </div>
        </div>

        {/* Individual form */}
        {type === "individual" && (
          <form action={createAssignment} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                {candidates.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    ⚠ No candidates yet.{" "}
                    <a href="/admin/candidates" className="underline">Add candidates first.</a>
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#475569]">Assessment *</label>
                <select
                  name="assessmentId"
                  required
                  defaultValue={defaultAssessmentId ?? ""}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="">Select assessment…</option>
                  {assessments.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignment settings */}
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#475569]">Assignment settings</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#475569]">Expiry date <span className="font-normal text-[#94A3B8]">(optional)</span></label>
                  <input
                    type="datetime-local"
                    name="expiresAt"
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-[#2563EB] focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-[#94A3B8]">Test locks after this date/time</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#475569]">Duration <span className="font-normal text-[#94A3B8]">(minutes, optional)</span></label>
                  <input
                    type="number"
                    name="durationMinutes"
                    min="1"
                    max="480"
                    placeholder="e.g. 45"
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-[#2563EB] focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-[#94A3B8]">Overrides assessment default</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-[#F1F5F9] pt-4">
              <button
                type="submit"
                disabled={candidates.length === 0 || assessments.length === 0}
                className="rounded-xl bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1d4edb] disabled:opacity-40 transition"
              >
                Assign to Candidate
              </button>
            </div>
          </form>
        )}

        {/* Batch form */}
        {type === "batch" && (
          <form action={bulkAssignBatch} className="space-y-4">
            <div className="rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-xs text-violet-700">
              Select one or more batches. All candidates across the selected batches will be assigned. Duplicates are skipped automatically.
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-[#475569]">
                  Batches * <span className="ml-1 font-normal text-violet-600">({selectedBatches.size} selected)</span>
                </p>
                <div className="space-y-2 rounded-lg border border-violet-200 p-3 max-h-48 overflow-y-auto">
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
                {selectedBatches.size === 0 && (
                  <p className="mt-1 text-xs text-amber-600">Select at least one batch.</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#475569]">Assessment *</label>
                <select
                  name="assessmentId"
                  required
                  defaultValue={defaultAssessmentId ?? ""}
                  className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm text-[#334155] focus:border-violet-500 focus:outline-none"
                >
                  <option value="">Select assessment…</option>
                  {assessments.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignment settings */}
            <div className="rounded-lg border border-violet-100 bg-violet-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Assignment settings</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#475569]">Expiry date <span className="font-normal text-[#94A3B8]">(optional)</span></label>
                  <input
                    type="datetime-local"
                    name="expiresAt"
                    className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm text-[#334155] focus:border-violet-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-[#94A3B8]">Test locks after this date/time</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#475569]">Duration <span className="font-normal text-[#94A3B8]">(minutes, optional)</span></label>
                  <input
                    type="number"
                    name="durationMinutes"
                    min="1"
                    max="480"
                    placeholder="e.g. 45"
                    className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm text-[#334155] focus:border-violet-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-[#94A3B8]">Overrides assessment default</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-violet-100 pt-4">
              <button
                type="submit"
                disabled={assessments.length === 0 || selectedBatches.size === 0}
                className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-40 transition"
              >
                Assign {selectedBatches.size > 1 ? `${selectedBatches.size} Batches` : "Batch"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

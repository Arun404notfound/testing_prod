"use client";

import { useState } from "react";

type Candidate = { id: string; fullName: string; email: string };

export function ProgramAssignmentForm({
  candidates,
  batches,
  assignProgramToCandidate,
  assignProgramToBatch,
}: {
  candidates: Candidate[];
  batches: string[];
  assignProgramToCandidate: (formData: FormData) => Promise<void>;
  assignProgramToBatch: (formData: FormData) => Promise<void>;
}) {
  const hasBatches = batches.length > 0;
  const [type, setType] = useState<"individual" | "batch">("individual");
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());

  function toggleBatch(name: string) {
    setSelectedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {/* Type toggle */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#475569]">Assignment type</p>
        <div className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 gap-1">
          <button
            type="button"
            onClick={() => setType("individual")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              type === "individual" ? "bg-[#0F766E] text-white shadow-sm" : "text-[#64748B] hover:text-[#334155]"
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
                ? "bg-[#0F766E] text-white shadow-sm"
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
        <form action={assignProgramToCandidate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#475569]">Candidate *</label>
              <select
                name="candidateId"
                required
                defaultValue=""
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-[#0F766E] focus:outline-none"
              >
                <option value="" disabled>Select a candidate…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName} ({c.email})</option>
                ))}
              </select>
              {candidates.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚠ No candidates yet. <a href="/admin/candidates" className="underline">Add candidates first.</a>
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#475569]">Deadline <span className="font-normal text-[#94A3B8]">(optional)</span></label>
              <input
                type="datetime-local"
                name="expiresAt"
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-[#0F766E] focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-[#94A3B8]">Every module in the Program locks after this date/time</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={candidates.length === 0}
              className="tg-button-primary text-sm disabled:opacity-40"
            >
              Assign & Send Invite
            </button>
          </div>
        </form>
      )}

      {/* Batch form */}
      {type === "batch" && (
        <form action={assignProgramToBatch} className="space-y-4">
          <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-xs text-[#0F766E]">
            Select one or more batches. Every candidate across the selected batches gets their own link through the whole Program. Duplicates are skipped automatically.
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-[#475569]">
                Batches * <span className="ml-1 font-normal text-[#0F766E]">({selectedBatches.size} selected)</span>
              </p>
              <div className="space-y-2 rounded-lg border border-teal-200 p-3 max-h-48 overflow-y-auto">
                {batches.map((b) => {
                  const checked = selectedBatches.has(b);
                  return (
                    <label key={b} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-teal-50 transition">
                      <input
                        type="checkbox"
                        name="batchName"
                        value={b}
                        checked={checked}
                        onChange={() => toggleBatch(b)}
                        className="h-4 w-4 rounded border-teal-300 accent-[#0F766E]"
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
              <label className="mb-1.5 block text-xs font-medium text-[#475569]">Deadline <span className="font-normal text-[#94A3B8]">(optional)</span></label>
              <input
                type="datetime-local"
                name="expiresAt"
                className="w-full rounded-lg border border-teal-200 px-3 py-2 text-sm text-[#334155] focus:border-[#0F766E] focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-[#94A3B8]">Every module in the Program locks after this date/time</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={selectedBatches.size === 0}
              className="tg-button-primary text-sm disabled:opacity-40"
            >
              Assign {selectedBatches.size > 1 ? `${selectedBatches.size} Batches` : "Batch"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

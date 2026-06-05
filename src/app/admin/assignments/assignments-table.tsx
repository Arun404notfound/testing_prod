"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Trash2, Filter, X } from "lucide-react";

const STATUS_STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  assigned: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", cls: "bg-slate-50 text-slate-500 border-slate-200", dot: "bg-slate-300" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export type AssignmentRow = {
  id: string;
  status: string;
  assignedAt: string;
  candidate: { fullName: string; email: string; batchName: string | null };
  assessment: { id: string; title: string };
  result: { id: string } | null;
};

export function AssignmentsTable({
  assignments,
  batches,
  cancelAssignment,
  bulkDeleteAssignments,
}: {
  assignments: AssignmentRow[];
  batches: string[];
  cancelAssignment: (id: string) => Promise<void>;
  bulkDeleteAssignments: (ids: string[]) => Promise<void>;
}) {
  const [filterBatch, setFilterBatch] = useState("");
  const [filterAssessment, setFilterAssessment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const allAssessments = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of assignments) map.set(a.assessment.id, a.assessment.title);
    return [...map.entries()];
  }, [assignments]);

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      if (filterBatch && a.candidate.batchName !== filterBatch) return false;
      if (filterAssessment && a.assessment.id !== filterAssessment) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      return true;
    });
  }, [assignments, filterBatch, filterAssessment, filterStatus]);

  const filteredIds = useMemo(() => new Set(filtered.map((a) => a.id)), [filtered]);
  const allFilteredSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));
  const someFilteredSelected = filtered.some((a) => selected.has(a.id));
  const selectedInFiltered = filtered.filter((a) => selected.has(a.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.add(id);
        return next;
      });
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setFilterBatch("");
    setFilterAssessment("");
    setFilterStatus("");
  }

  const hasFilters = Boolean(filterBatch || filterAssessment || filterStatus);

  function handleBulkDelete() {
    if (selectedInFiltered.length === 0) return;
    startTransition(async () => {
      await bulkDeleteAssignments(selectedInFiltered.map((a) => a.id));
      setSelected(new Set());
      setConfirmBulkDelete(false);
    });
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
      {/* Header + filters */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">All Assignments ({assignments.length})</p>
            <p className="text-xs text-[#64748B]">
              {filtered.length !== assignments.length ? `${filtered.length} shown · ` : ""}
              {assignments.filter((a) => a.status === "assigned").length} pending ·{" "}
              {assignments.filter((a) => a.status === "completed").length} completed ·{" "}
              {assignments.filter((a) => a.status === "cancelled").length} cancelled
            </p>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC] transition"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={13} className="text-[#94A3B8]" />
          {batches.length > 0 && (
            <select
              value={filterBatch}
              onChange={(e) => { setFilterBatch(e.target.value); setSelected(new Set()); }}
              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#334155] focus:border-[#1D4ED8] focus:outline-none"
            >
              <option value="">All batches</option>
              {batches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
          <select
            value={filterAssessment}
            onChange={(e) => { setFilterAssessment(e.target.value); setSelected(new Set()); }}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#334155] focus:border-[#1D4ED8] focus:outline-none"
          >
            <option value="">All assessments</option>
            {allAssessments.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setSelected(new Set()); }}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#334155] focus:border-[#1D4ED8] focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="assigned">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Bulk action bar — shown when something is selected */}
        {selectedInFiltered.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5">
            <span className="text-xs font-semibold text-rose-700">
              {selectedInFiltered.length} assignment{selectedInFiltered.length !== 1 ? "s" : ""} selected
            </span>
            <div className="ml-auto flex items-center gap-2">
              {!confirmBulkDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
                >
                  <Trash2 size={12} /> Delete selected
                </button>
              ) : (
                <>
                  <span className="text-xs text-rose-700">Confirm delete?</span>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={pending}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                  >
                    {pending ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(false)}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-[#64748B]">
            {assignments.length === 0 ? "No assignments yet. Create one above." : "No assignments match the current filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-left text-xs font-semibold text-[#94A3B8]">
                <th className="px-4 py-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => { if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected; }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded accent-rose-600 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-[#94A3B8]">Select all</span>
                  </label>
                </th>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Assessment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {filtered.map((a) => {
                const style = STATUS_STYLES[a.status] ?? STATUS_STYLES.assigned;
                const isSelected = selected.has(a.id);
                return (
                  <tr key={a.id} className={`transition-colors ${isSelected ? "bg-rose-50/60" : "hover:bg-[#FAFBFE]"}`}>
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(a.id)}
                        className="h-4 w-4 rounded accent-rose-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-[#0F172A]">{a.candidate.fullName}</p>
                      <p className="text-xs text-[#94A3B8]">{a.candidate.email}</p>
                      {a.candidate.batchName && (
                        <p className="text-[11px] text-violet-500 font-medium">{a.candidate.batchName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[#334155]">{a.assessment.title}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${style.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#64748B]">{fmtDate(a.assignedAt)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {a.result?.id && (
                          <Link href={`/admin/reports/${a.result.id}`}
                            className="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs font-medium text-[#1D4ED8] hover:bg-[#EFF6FF] transition">
                            Report
                          </Link>
                        )}
                        {a.status === "assigned" && (
                          <button
                            type="button"
                            onClick={() => startTransition(() => cancelAssignment(a.id))}
                            className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 transition"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

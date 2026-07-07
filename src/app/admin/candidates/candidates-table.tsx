"use client";

import { useState, useMemo, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, Search, ChevronDown, X } from "lucide-react";

export type CandidateRow = {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  employeeId: string;
  designation: string;
  department: string;
  location: string;
  batchName: string | null;
};

// ─── Searchable batch combobox ────────────────────────────────────────────────

function BatchCombobox({
  batches,
  totalCount,
  value,
  onChange,
}: {
  batches: { name: string; count: number }[];
  totalCount: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return batches;
    return batches.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()));
  }, [batches, query]);

  const displayLabel = value === "all"
    ? `All Candidates (${totalCount})`
    : batches.find((b) => b.name === value)
      ? `${value} (${batches.find((b) => b.name === value)!.count})`
      : "All Candidates";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative w-64">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#334155] shadow-sm hover:bg-[#F8FAFC] transition"
      >
        <span className={`truncate ${value !== "all" ? "text-violet-700 font-semibold" : ""}`}>{displayLabel}</span>
        <ChevronDown size={14} className={`shrink-0 text-[#94A3B8] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-[#F1F5F9] px-3 py-2">
            <Search size={13} className="shrink-0 text-[#94A3B8]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search batch…"
              className="w-full bg-transparent text-sm text-[#334155] placeholder:text-[#94A3B8] focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="shrink-0 text-[#94A3B8] hover:text-[#475569]">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {!query && (
              <li>
                <button
                  type="button"
                  onClick={() => select("all")}
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm transition hover:bg-[#F8FAFC] ${value === "all" ? "font-semibold text-[#2563EB] bg-[#EFF6FF]" : "text-[#334155]"}`}
                >
                  <span>All Candidates</span>
                  <span className="text-xs text-[#94A3B8]">{totalCount}</span>
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-[#94A3B8]">No batches match</li>
            ) : (
              filtered.map((b) => (
                <li key={b.name}>
                  <button
                    type="button"
                    onClick={() => select(b.name)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm transition hover:bg-violet-50 ${value === b.name ? "font-semibold text-violet-700 bg-violet-50" : "text-[#334155]"}`}
                  >
                    <span>{b.name}</span>
                    <span className="text-xs text-[#94A3B8]">{b.count}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

export function CandidatesTable({
  candidates,
  editId,
  deleteCandidateById,
  bulkDeleteCandidates,
}: {
  candidates: CandidateRow[];
  editId: string | null;
  deleteCandidateById: (id: string) => Promise<void>;
  bulkDeleteCandidates: (ids: string[]) => Promise<void>;
}) {
  const [activeBatch, setActiveBatch] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  // Only non-empty batches
  const batches = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of candidates) {
      if (c.batchName) map.set(c.batchName, (map.get(c.batchName) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [candidates]);

  const filtered = useMemo(
    () => activeBatch === "all" ? candidates : candidates.filter((c) => c.batchName === activeBatch),
    [candidates, activeBatch],
  );

  const filteredIds = useMemo(() => new Set(filtered.map((c) => c.id)), [filtered]);
  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someFilteredSelected = filtered.some((c) => selected.has(c.id));
  const selectedInFiltered = filtered.filter((c) => selected.has(c.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelected((prev) => { const n = new Set(prev); filteredIds.forEach((id) => n.delete(id)); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); filteredIds.forEach((id) => n.add(id)); return n; });
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function handleBulkDelete() {
    startTransition(async () => {
      await bulkDeleteCandidates(selectedInFiltered.map((c) => c.id));
      setSelected(new Set());
      setConfirmBulkDelete(false);
    });
  }

  // Reset selection when batch changes
  function handleBatchChange(v: string) {
    setActiveBatch(v);
    setSelected(new Set());
    setConfirmBulkDelete(false);
    setConfirmBatchDelete(false);
  }

  function handleDeleteBatch() {
    startTransition(async () => {
      await bulkDeleteCandidates(filtered.map((c) => c.id));
      setSelected(new Set());
      setConfirmBatchDelete(false);
      setActiveBatch("all");
    });
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">
              {activeBatch === "all" ? `All Candidates (${candidates.length})` : `Batch: ${activeBatch} (${filtered.length})`}
            </p>
            {activeBatch !== "all" && filtered.length !== candidates.length && (
              <p className="text-xs text-[#64748B]">{filtered.length} of {candidates.length} total</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <BatchCombobox
              batches={batches}
              totalCount={candidates.length}
              value={activeBatch}
              onChange={handleBatchChange}
            />
            {activeBatch !== "all" && (
              <>
                <Link
                  href={`/admin/assignments?batchName=${encodeURIComponent(activeBatch)}`}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition"
                >
                  Assign batch →
                </Link>
                {!confirmBatchDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmBatchDelete(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
                  >
                    <Trash2 size={12} /> Delete Batch
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-700">Delete all {filtered.length} candidates in "{activeBatch}"?</span>
                    <button
                      type="button"
                      onClick={handleDeleteBatch}
                      disabled={pending}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                    >
                      {pending ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmBatchDelete(false)}
                      className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedInFiltered.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5">
            <span className="text-xs font-semibold text-rose-700">
              {selectedInFiltered.length} candidate{selectedInFiltered.length !== 1 ? "s" : ""} selected
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
                  <span className="text-xs text-rose-700">This will also delete their login accounts. Confirm?</span>
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
          <p className="text-sm text-[#64748B]">No candidates in this batch.</p>
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
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Emp ID</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {filtered.map((c) => {
                const isSelected = selected.has(c.id);
                return (
                  <tr
                    key={c.id}
                    className={`transition-colors ${isSelected ? "bg-rose-50/60" : editId === c.id ? "bg-[#EFF6FF]" : "hover:bg-[#FAFBFE]"}`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(c.id)}
                        className="h-4 w-4 rounded accent-rose-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-[#0F172A]">{c.fullName}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[#334155]">{c.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.batchName ? (
                        <button
                          type="button"
                          onClick={() => handleBatchChange(c.batchName!)}
                          className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 transition"
                        >
                          {c.batchName}
                        </button>
                      ) : <span className="text-[11px] text-[#CBD5E1]">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-[#64748B]">{c.mobile}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[#64748B]">{c.employeeId}</td>
                    <td className="px-4 py-3.5 text-[#64748B]">{c.designation}</td>
                    <td className="px-4 py-3.5 text-[#64748B]">{c.department}</td>
                    <td className="px-4 py-3.5 text-[#64748B]">{c.location}</td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/candidates?editId=${c.id}`}
                        className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] transition"
                      >
                        <Pencil size={11} /> Edit
                      </Link>
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

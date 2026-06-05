"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ClipboardList, CheckCircle2, ChevronRight, Filter, X } from "lucide-react";

type Assignment = {
  id: string;
  status: string;
  assignedAt: string;
  assessment: { title: string; description: string | null };
  result: { id: string } | null;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    assigned:    { label: "Pending",     bg: "#FFF7ED", text: "#C2410C", dot: "#F97316" },
    in_progress: { label: "In Progress", bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
    completed:   { label: "Completed",   bg: "#F0FDF4", text: "#15803D", dot: "#22C55E" },
  };
  const s = map[status] ?? { label: status, bg: "#F1F5F9", text: "#475569", dot: "#94A3B8" };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

export function AssignmentsList({ assignments }: { assignments: Assignment[] }) {
  const [filterStatus, setFilterStatus] = useState("");

  const filtered = useMemo(() => {
    if (!filterStatus) return assignments;
    return assignments.filter((a) => a.status === filterStatus);
  }, [assignments, filterStatus]);

  const hasFilter = Boolean(filterStatus);

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white py-16 text-center">
        <ClipboardList size={40} className="text-[#CBD5E1] mb-3" />
        <p className="font-medium text-[#475569]">No assessments assigned yet</p>
        <p className="mt-1 text-sm text-[#94A3B8]">Your administrator will assign assessments to you shortly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-[#94A3B8]" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#334155] focus:border-[#1D4ED8] focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="assigned">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={() => setFilterStatus("")}
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC] transition"
          >
            <X size={11} /> Clear filter
          </button>
        )}
        {hasFilter && (
          <span className="text-xs text-[#94A3B8]">
            {filtered.length} of {assignments.length} shown
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white py-12 text-center">
          <p className="font-medium text-[#475569]">No assessments match this filter</p>
          <button
            type="button"
            onClick={() => setFilterStatus("")}
            className="mt-2 text-sm text-[#1D4ED8] hover:underline"
          >
            Clear filter
          </button>
        </div>
      ) : (
        filtered.map((assignment) => {
          const isDone = assignment.status === "completed" && assignment.result;
          return (
            <div
              key={assignment.id}
              className="group flex flex-col gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-all hover:border-[#93C5FD] hover:shadow-md md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: isDone ? "#F0FDF4" : "#EFF6FF" }}
                >
                  {isDone ? (
                    <CheckCircle2 size={24} className="text-emerald-600" />
                  ) : (
                    <ClipboardList size={24} className="text-[#1D4ED8]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-semibold text-[#0F172A]">{assignment.assessment.title}</p>
                    <StatusBadge status={assignment.status} />
                  </div>
                  {assignment.assessment.description && (
                    <p className="mt-1 text-sm text-[#64748B] line-clamp-2">{assignment.assessment.description}</p>
                  )}
                  <p className="mt-2 text-xs text-[#94A3B8]">
                    Assigned on {new Date(assignment.assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>

              {isDone ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/candidate/reports/${assignment.result!.id}/submissions`}
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    View Submissions
                  </Link>
                  <Link
                    href={`/candidate/reports/${assignment.result!.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-5 py-2.5 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F1F5F9]"
                  >
                    View Report
                    <ChevronRight size={16} />
                  </Link>
                </div>
              ) : (
                <Link
                  href={`/candidate/test/${assignment.id}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E40AF] hover:shadow-md"
                >
                  Start Test
                  <ChevronRight size={16} />
                </Link>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

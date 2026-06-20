"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ClipboardList, Users, Brain, ArrowRight, Loader2, X } from "lucide-react";

interface SearchResults {
  assessments: { id: string; title: string; status: string; type: string }[];
  candidates: { id: string; fullName: string; email: string }[];
  competencies: { id: string; name: string }[];
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults(null);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setResults(await res.json() as SearchResults);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  const handleChange = (v: string) => { setQuery(v); search(v); };

  const navigate = (href: string) => { router.push(href); onClose(); };

  const hasResults = results && (
    results.assessments.length + results.candidates.length + results.competencies.length > 0
  );
  const noResults = results && !hasResults && query.trim().length > 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-[#EAECF0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F3F4F6]">
          {loading
            ? <Loader2 size={16} className="shrink-0 text-[#9CA3AF] animate-spin" />
            : <Search size={16} className="shrink-0 text-[#9CA3AF]" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search assessments, candidates, competencies…"
            className="flex-1 bg-transparent text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none"
          />
          {query && (
            <button onClick={() => handleChange("")} className="shrink-0 text-[#9CA3AF] hover:text-[#6B7280] transition">
              <X size={14} />
            </button>
          )}
          <kbd className="shrink-0 rounded border border-[#E5E7EB] bg-[#F9FAFB] px-1.5 py-0.5 text-[10px] font-mono text-[#9CA3AF]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {hasResults && (
          <div className="max-h-[380px] overflow-y-auto py-2">
            {results!.assessments.length > 0 && (
              <Section label="Assessments" icon={<ClipboardList size={12} />}>
                {results!.assessments.map((a) => (
                  <ResultRow
                    key={a.id}
                    primary={a.title}
                    secondary={`${a.status} · ${a.type.replace(/_/g, " ").toLowerCase()}`}
                    onClick={() => navigate(`/admin/assessments/${a.id}/builder`)}
                  />
                ))}
              </Section>
            )}
            {results!.candidates.length > 0 && (
              <Section label="Candidates" icon={<Users size={12} />}>
                {results!.candidates.map((c) => (
                  <ResultRow
                    key={c.id}
                    primary={c.fullName}
                    secondary={c.email}
                    onClick={() => navigate(`/admin/candidates`)}
                  />
                ))}
              </Section>
            )}
            {results!.competencies.length > 0 && (
              <Section label="Competencies" icon={<Brain size={12} />}>
                {results!.competencies.map((c) => (
                  <ResultRow
                    key={c.id}
                    primary={c.name}
                    onClick={() => navigate(`/admin/competencies`)}
                  />
                ))}
              </Section>
            )}
          </div>
        )}

        {noResults && (
          <div className="px-4 py-8 text-center text-[13px] text-[#9CA3AF]">
            No results for <span className="font-semibold text-[#374151]">&ldquo;{query}&rdquo;</span>
          </div>
        )}

        {!query && (
          <div className="px-4 py-5 text-center text-[12px] text-[#9CA3AF]">
            Start typing to search across assessments, candidates, and competencies
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 px-4 py-1.5">
        <span className="text-[#9CA3AF]">{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">{label}</p>
      </div>
      {children}
    </div>
  );
}

function ResultRow({ primary, secondary, onClick }: { primary: string; secondary?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-[#F4F6F9] transition"
    >
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-[#111827]">{primary}</p>
        {secondary && <p className="truncate text-[11px] text-[#9CA3AF]">{secondary}</p>}
      </div>
      <ArrowRight size={13} className="shrink-0 text-[#D1D5DB] group-hover:text-[#0F766E] transition" />
    </button>
  );
}

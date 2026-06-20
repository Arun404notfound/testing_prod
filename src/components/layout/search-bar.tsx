"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ClipboardList, Users, ArrowRight, Loader2 } from "lucide-react";

interface SearchResults {
  assessments: { id: string; title: string; status: string }[];
  candidates: { id: string; fullName: string; email: string }[];
}

const STATUS_COLOR: Record<string, string> = {
  published: "text-emerald-600 bg-emerald-50",
  draft: "text-amber-600 bg-amber-50",
  archived: "text-slate-500 bg-slate-100",
};

export function SearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults(null);
      setLoading(false);
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json() as SearchResults;
          setResults(data);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    search(v);
  };

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
    setResults(null);
  };

  const hasResults = results && (results.assessments.length + results.candidates.length) > 0;
  const noResults = results && !hasResults && query.trim().length > 0 && !loading;

  return (
    <div ref={containerRef} className="relative w-72 shrink-0">
      {/* Input */}
      <div className="relative">
        {loading
          ? <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] animate-spin" />
          : <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        }
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          placeholder="Search assessments, candidates…"
          className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] py-2 pl-8 pr-3 text-[13px] text-[#374151] placeholder:text-[#9CA3AF] focus:border-[#0F766E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/10 transition"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-full rounded-xl border border-[#EAECF0] bg-white shadow-lg z-50 overflow-hidden">

          {/* Loading skeleton */}
          {loading && (
            <div className="px-4 py-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-6 w-6 rounded-full bg-[#F3F4F6]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-3/4 rounded bg-[#F3F4F6]" />
                    <div className="h-2 w-1/2 rounded bg-[#F3F4F6]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && hasResults && (
            <div className="py-1.5 max-h-80 overflow-y-auto">
              {results!.assessments.length > 0 && (
                <>
                  <p className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                    <ClipboardList size={11} /> Assessments
                  </p>
                  {results!.assessments.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => navigate(`/admin/assessments/${a.id}/builder`)}
                      className="group flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F4F6F9] transition"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E6F7F1]">
                        <ClipboardList size={13} className="text-[#0F766E]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#111827]">{a.title}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOR[a.status] ?? "text-slate-500 bg-slate-100"}`}>
                        {a.status}
                      </span>
                      <ArrowRight size={12} className="shrink-0 text-[#D1D5DB] group-hover:text-[#0F766E] transition" />
                    </button>
                  ))}
                </>
              )}

              {results!.candidates.length > 0 && (
                <>
                  {results!.assessments.length > 0 && <div className="mx-3 my-1 border-t border-[#F3F4F6]" />}
                  <p className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                    <Users size={11} /> Candidates
                  </p>
                  {results!.candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => navigate(`/admin/candidates`)}
                      className="group flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F4F6F9] transition"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#10B981] text-[10px] font-bold text-white">
                        {c.fullName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#111827]">{c.fullName}</p>
                        <p className="truncate text-[11px] text-[#9CA3AF]">{c.email}</p>
                      </div>
                      <ArrowRight size={12} className="shrink-0 text-[#D1D5DB] group-hover:text-[#0F766E] transition" />
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* No results */}
          {noResults && (
            <div className="px-4 py-5 text-center text-[13px] text-[#9CA3AF]">
              No results for <span className="font-semibold text-[#374151]">&ldquo;{query}&rdquo;</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

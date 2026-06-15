"use client";

import { useRouter } from "next/navigation";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flag,
  Grid3X3,
  Loader2,
  SendHorizonal,
  X,
} from "lucide-react";
import type { TestBlock } from "@/lib/candidate-test-payload";

// ─── Types ───────────────────────────────────────────────────────────────────

type Answers = Record<string, number | string | { most: string; least: string } | undefined>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAnswered(block: TestBlock, answers: Answers): boolean {
  const v = answers[block.key];
  if (v === undefined || v === null) return false;
  if (block.kind === "triad") {
    const t = v as { most?: string; least?: string };
    return Boolean(t.most && t.least && t.most !== t.least);
  }
  return true;
}

// True when a triad has exactly one of most/least filled but not both
function isPartialTriad(block: TestBlock, answers: Answers): boolean {
  if (block.kind !== "triad") return false;
  const v = answers[block.key] as { most?: string; least?: string } | undefined;
  if (!v) return false;
  const hasAny = Boolean(v.most || v.least);
  const hasAll = Boolean(v.most && v.least && v.most !== v.least);
  return hasAny && !hasAll;
}

// ─── Timer ───────────────────────────────────────────────────────────────────

function useCountdownTimer(totalSeconds: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expiredRef = useRef(false);
  const cbRef = useRef(onExpire);
  cbRef.current = onExpire;
  const hasTimer = totalSeconds > 0;

  useEffect(() => {
    if (!hasTimer) return; // no timer — never expire
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (!expiredRef.current) {
            expiredRef.current = true;
            setTimeout(() => cbRef.current(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [hasTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const isWarning = remaining < 10 * 60 && remaining > 3 * 60;
  const isCritical = remaining <= 3 * 60;
  return { mm, ss, isWarning, isCritical };
}

// ─── Timer pill ───────────────────────────────────────────────────────────────

function TimerPill({ mm, ss, isWarning, isCritical }: { mm: string; ss: string; isWarning: boolean; isCritical: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-sm font-bold tabular-nums transition-colors ${
      isCritical ? "border-rose-300 bg-rose-50 text-rose-600"
      : isWarning ? "border-amber-300 bg-amber-50 text-amber-600"
      : "border-blue-200 bg-blue-50 text-[#1D4ED8]"
    }`}>
      <Clock size={13} className={isCritical || isWarning ? "animate-pulse" : ""} />
      {mm}:{ss}
    </div>
  );
}

// ─── Question Navigator (read-only — unidirectional) ─────────────────────────

function QuestionNavigator({ blocks, answers, currentIndex }: {
  blocks: TestBlock[];
  answers: Answers;
  currentIndex: number;
}) {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]">Questions</p>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-5 gap-1.5 pr-1">
          {blocks.map((b, i) => {
            const done = isAnswered(b, answers);
            const cur = i === currentIndex;
            return (
              <div
                key={b.key}
                className={`flex h-8 w-full items-center justify-center rounded-lg text-xs font-semibold select-none ${
                  cur
                    ? "bg-[#1D4ED8] text-white shadow-sm"
                    : done
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-[#F1F5F9] text-[#64748B]"
                }`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 space-y-1.5 border-t border-[#F1F5F9] pt-3">
        {[
          { cls: "bg-[#1D4ED8]", label: "Current" },
          { cls: "bg-emerald-400", label: "Answered" },
          { cls: "bg-[#E2E8F0]", label: "Not answered" },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-sm ${cls}`} />
            <span className="text-[11px] text-[#64748B]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Likert (horizontal scale, compact) ──────────────────────────────────────

const LIKERT_OPTS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

function LikertQuestion({ block, answers, setAnswers }: {
  block: Extract<TestBlock, { kind: "likert" }>;
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
}) {
  const val = answers[block.key] as number | undefined;
  return (
    <div className="space-y-5">
      <p className="text-lg font-semibold leading-snug text-[#0F172A] sm:text-xl">{block.prompt}</p>

      {/* Desktop: horizontal 5-col scale */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-5 gap-2">
          {LIKERT_OPTS.map((opt) => {
            const sel = val === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [block.key]: opt.value }))}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-4 text-center transition-all duration-150 ${
                  sel
                    ? "border-[#1D4ED8] bg-gradient-to-b from-[#EFF6FF] to-[#DBEAFE] shadow-md"
                    : "border-[#E2E8F0] bg-white hover:border-[#93C5FD] hover:bg-[#F8FAFC]"
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                  sel ? "border-[#1D4ED8] bg-[#1D4ED8] text-white" : "border-[#CBD5E1] text-[#475569]"
                }`}>
                  {opt.value}
                </span>
                <span className={`text-[11px] font-medium leading-tight ${sel ? "text-[#1E40AF]" : "text-[#64748B]"}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Scale endpoints label */}
        <div className="mt-2 flex justify-between px-1">
          <span className="text-[10px] text-[#94A3B8]">← Least like me</span>
          <span className="text-[10px] text-[#94A3B8]">Most like me →</span>
        </div>
      </div>

      {/* Mobile: vertical stacked */}
      <div className="space-y-2 sm:hidden">
        {LIKERT_OPTS.map((opt) => {
          const sel = val === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAnswers((a) => ({ ...a, [block.key]: opt.value }))}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                sel ? "border-[#1D4ED8] bg-[#EFF6FF]" : "border-[#E2E8F0] bg-white"
              }`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                sel ? "border-[#1D4ED8] bg-[#1D4ED8] text-white" : "border-[#CBD5E1] text-[#475569]"
              }`}>
                {opt.value}
              </span>
              <span className={`text-sm font-medium ${sel ? "text-[#1E40AF]" : "text-[#334155]"}`}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MCQ ─────────────────────────────────────────────────────────────────────

function McqQuestion({ block, answers, setAnswers }: {
  block: Extract<TestBlock, { kind: "item_mcq" | "item_tf" | "legacy_mcq" }>;
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
}) {
  const options =
    block.kind === "legacy_mcq"
      ? block.options.map((o) => ({ id: o.value, label: o.label }))
      : block.options.map((o) => ({ id: o.optionId, label: o.label }));
  const prompt = block.kind === "legacy_mcq" ? block.questionText : block.prompt;
  const val = answers[block.key];

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold leading-snug text-[#0F172A] sm:text-xl">{prompt}</p>
      <div className="space-y-2">
        {options.map((opt, idx) => {
          const sel = val === opt.id;
          const letter = String.fromCharCode(65 + idx);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAnswers((a) => ({ ...a, [block.key]: opt.id }))}
              className={`group flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                sel ? "border-[#1D4ED8] bg-[#EFF6FF]" : "border-[#E2E8F0] bg-white hover:border-[#93C5FD] hover:bg-[#F8FAFC]"
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                sel ? "bg-[#1D4ED8] text-white" : "bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#DBEAFE] group-hover:text-[#1D4ED8]"
              }`}>
                {letter}
              </span>
              <span className={`text-sm font-medium ${sel ? "text-[#1E40AF]" : "text-[#334155]"}`}>{opt.label}</span>
              {sel && <CheckCircle2 size={16} className="ml-auto shrink-0 text-[#1D4ED8]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Triad ────────────────────────────────────────────────────────────────────

const LETTERS = ["A", "B", "C", "D", "E"];

function TriadQuestion({ block, answers, setAnswers }: {
  block: Extract<TestBlock, { kind: "triad" }>;
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
}) {
  const tv = (answers[block.key] as { most?: string; least?: string }) ?? {};
  const setMost = (id: string) => setAnswers((a) => ({ ...a, [block.key]: { most: id, least: tv.least === id ? "" : (tv.least ?? "") } }));
  const setLeast = (id: string) => setAnswers((a) => ({ ...a, [block.key]: { most: tv.most === id ? "" : (tv.most ?? ""), least: id } }));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-semibold text-[#0F172A] sm:text-xl">Situational Preference</p>
        <p className="mt-1 text-sm text-[#64748B]">
          Select one statement that is <span className="font-semibold text-emerald-600">Most like you</span> and one that is <span className="font-semibold text-rose-500">Least like you</span>.
        </p>
      </div>

      {/* Selection status bar */}
      <div className="flex gap-2">
        <div className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all ${
          tv.most ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-dashed border-[#CBD5E1] text-[#94A3B8]"
        }`}>
          <CheckCircle2 size={13} />
          {tv.most ? `Most: ${LETTERS[block.statements.findIndex((s) => s.id === tv.most)] ?? "?"}` : "Select Most"}
        </div>
        <div className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all ${
          tv.least ? "border-rose-300 bg-rose-50 text-rose-600" : "border-dashed border-[#CBD5E1] text-[#94A3B8]"
        }`}>
          <X size={13} />
          {tv.least ? `Least: ${LETTERS[block.statements.findIndex((s) => s.id === tv.least)] ?? "?"}` : "Select Least"}
        </div>
      </div>

      {/* Statement cards */}
      <div className="space-y-2">
        {block.statements.map((s, idx) => {
          const isMost = tv.most === s.id;
          const isLeast = tv.least === s.id;
          const letter = LETTERS[idx] ?? String(idx + 1);
          return (
            <div key={s.id} className={`overflow-hidden rounded-2xl border-2 transition-all ${
              isMost ? "border-emerald-400 bg-emerald-50/60"
              : isLeast ? "border-rose-300 bg-rose-50/60"
              : "border-[#E2E8F0] bg-white"
            }`}>
              <div className="flex items-start gap-3 px-4 py-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  isMost ? "bg-emerald-500 text-white" : isLeast ? "bg-rose-400 text-white" : "bg-[#F1F5F9] text-[#475569]"
                }`}>
                  {letter}
                </span>
                <p className="flex-1 text-sm leading-relaxed text-[#0F172A]">{s.text}</p>
                {(isMost || isLeast) && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isMost ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"
                  }`}>
                    {isMost ? "MOST" : "LEAST"}
                  </span>
                )}
              </div>
              <div className="flex border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setMost(s.id)}
                  disabled={isLeast}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all ${
                    isMost ? "bg-emerald-500 text-white"
                    : isLeast ? "cursor-not-allowed bg-[#F8FAFC] text-[#CBD5E1]"
                    : "bg-white text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  <CheckCircle2 size={11} />
                  {isMost ? "✓ Most" : "Most like me"}
                </button>
                <div className="w-px bg-[#F1F5F9]" />
                <button
                  type="button"
                  onClick={() => setLeast(s.id)}
                  disabled={isMost}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all ${
                    isLeast ? "bg-rose-400 text-white"
                    : isMost ? "cursor-not-allowed bg-[#F8FAFC] text-[#CBD5E1]"
                    : "bg-white text-rose-500 hover:bg-rose-50"
                  }`}
                >
                  <X size={11} />
                  {isLeast ? "✓ Least" : "Least like me"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Overlays ─────────────────────────────────────────────────────────────────


function TimesUpOverlay({ onSubmit, submitting }: { onSubmit: () => void; submitting: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
          <Clock size={30} className="text-rose-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#0F172A]">Time&apos;s Up!</h2>
        <p className="mt-2 text-sm text-[#64748B]">Your allotted time has ended. Your responses will now be submitted.</p>
        <button type="button" onClick={onSubmit} disabled={submitting}
          className="mt-6 w-full rounded-xl bg-[#1D4ED8] py-3 text-sm font-semibold text-white transition hover:bg-[#1E40AF] disabled:opacity-60">
          {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Submitting…</span> : "Submit My Responses"}
        </button>
      </div>
    </div>
  );
}

function SubmittingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Loader2 size={30} className="animate-spin text-[#1D4ED8]" />
        </div>
        <h2 className="text-xl font-bold text-[#0F172A]">Submitting Your Responses</h2>
        <p className="mt-2 text-sm text-[#64748B]">Please wait while your answers are being saved…</p>
      </div>
    </div>
  );
}

// ─── Mobile nav drawer ───────────────────────────────────────────────────────

function MobileNavDrawer({ blocks, answers, currentIndex, onClose }: {
  blocks: TestBlock[]; answers: Answers; currentIndex: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-semibold text-[#0F172A]">Question Navigator</p>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-[#64748B] hover:bg-[#F1F5F9]"><X size={18} /></button>
        </div>
        <QuestionNavigator blocks={blocks} answers={answers} currentIndex={currentIndex} />
      </div>
    </div>
  );
}

// ─── Main Runner ─────────────────────────────────────────────────────────────

// Best-effort fire-and-forget autosave — never throws, never blocks UI
async function autosave(
  attemptId: string,
  answers: Answers,
  skipped: Set<number>,
  blocks: TestBlock[],
) {
  try {
    const skippedKeys = [...skipped].map((i) => blocks[i]?.key).filter(Boolean);
    await fetch(`/api/candidate/attempts/${attemptId}/autosave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, skippedKeys }),
      credentials: "same-origin",
    });
  } catch {
    // best-effort — ignore
  }
}

export function CandidateTestRunner({
  assignmentId, blocks, assessmentTitle, candidateName, durationMinutes, attemptId,
}: {
  assignmentId: string;
  blocks: TestBlock[];
  assessmentTitle?: string;
  candidateName?: string;
  durationMinutes?: number;
  attemptId?: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timesUp, setTimesUp] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [unansweredWarning, setUnansweredWarning] = useState(false);
  // Prevents double-click from advancing two questions at once
  const navLockRef = useRef(false);

  const total = blocks.length;
  const block = blocks[currentIndex];

  const answeredSet = new Set(
    blocks.map((b, i) => (isAnswered(b, answers) ? i : null)).filter((x): x is number => x !== null)
  );
  const isCurrentAnswered = answeredSet.has(currentIndex);
  const progress = Math.round((answeredSet.size / total) * 100);
  const skipped = new Set<number>(); // no skipping — kept for autosave API compat

  // scroll question area to top on question change
  const questionScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    questionScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentIndex]);

  // Debounced auto-save to DB whenever answers change (1.5 s after last keystroke)
  const answersRef = useRef(answers);
  answersRef.current = answers;
  useEffect(() => {
    if (!attemptId) return;
    const id = setTimeout(() => {
      void autosave(attemptId, answersRef.current, new Set(), blocks);
    }, 1500);
    return () => clearTimeout(id);
  }, [answers, attemptId, blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reliable save on tab close / power off via sendBeacon
  useEffect(() => {
    if (!attemptId) return;
    const handleUnload = () => {
      const payload = JSON.stringify({ answers: answersRef.current, skippedKeys: [], trigger: "beforeunload" });
      try {
        navigator.sendBeacon(
          `/api/candidate/attempts/${attemptId}/autosave`,
          new Blob([payload], { type: "application/json" }),
        );
      } catch {
        // sendBeacon not available
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [attemptId, blocks]);

  const handleSubmit = useCallback(async (submissionType = "NORMAL") => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/candidate/demo-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, answers, skippedKeys: [], submissionType }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; resultId?: string; error?: string };
      if (!res.ok || !data.ok || typeof data.resultId !== "string") {
        setError(typeof data.error === "string" && data.error.length > 0 ? data.error : `Request failed (${res.status})`);
        setLoading(false);
        return;
      }
      try { sessionStorage.removeItem("activeAttemptId"); } catch { /* ignore */ }
      router.push(`/candidate/reports/${data.resultId}`);
    } catch {
      setError("Network error — could not reach the server.");
      setLoading(false);
    }
  }, [assignmentId, answers, skipped, blocks, router]);

  const handleTimesUp = useCallback(() => {
    setTimesUp(true);
    void handleSubmit("TIMED_OUT");
  }, [handleSubmit]);

  const effectiveDuration = (durationMinutes && durationMinutes > 0) ? durationMinutes : 0;
  const { mm, ss, isWarning, isCritical } = useCountdownTimer(effectiveDuration * 60, handleTimesUp);

  const handleNext = useCallback(() => {
    if (navLockRef.current) return;
    if (!isAnswered(blocks[currentIndex], answers)) {
      setUnansweredWarning(true);
      setTimeout(() => setUnansweredWarning(false), 2500);
      return;
    }
    navLockRef.current = true;

    if (attemptId) {
      void autosave(attemptId, answers, new Set(), blocks);
    }

    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      void handleSubmit();
    }

    setTimeout(() => { navLockRef.current = false; }, 300);
  }, [blocks, currentIndex, answers, total, attemptId, handleSubmit]);

  return (
    <>
      {(loading || timesUp) && <SubmittingOverlay />}
      {navOpen && (
        <MobileNavDrawer blocks={blocks} answers={answers} currentIndex={currentIndex}
          onClose={() => setNavOpen(false)} />
      )}

      {/*
        ROOT: h-full forces the container to fit the parent exactly.
        flex-col stacks: [sub-header] + [body].
      */}
      <div className="flex h-full flex-col overflow-hidden bg-[#F1F5F9]">

        {/* ── Sub-header ─────────────────────────────────────────────────────
            shrink-0: never shrinks. Shows assessment name + counter + timer.
        */}
        <div className="shrink-0 border-b border-[#E2E8F0] bg-white">
          <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#0F172A]">{assessmentTitle ?? "Assessment"}</p>
              {candidateName && <p className="text-[11px] text-[#94A3B8]">{candidateName}</p>}
            </div>
            <div className="hidden items-center gap-1.5 text-xs font-semibold text-[#475569] sm:flex">
              <CheckCircle2 size={13} className="text-emerald-500" />
              {answeredSet.size}/{total}
            </div>
            {effectiveDuration > 0 && <TimerPill mm={mm} ss={ss} isWarning={isWarning} isCritical={isCritical} />}
            <button type="button" onClick={() => setNavOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] lg:hidden">
              <Grid3X3 size={12} /> Q{currentIndex + 1}
            </button>
          </div>
          {/* Progress bar */}
          <div className="h-[3px] bg-[#E8EDF2]">
            <div className="h-full bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/*
          ── BODY ROW ───────────────────────────────────────────────────────
          flex-1 + min-h-0: takes all remaining height, flex children can't overflow.
        */}
        <div className="flex min-h-0 flex-1">

          {/* ── Left navigator (desktop only, read-only) ── */}
          <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r border-[#E2E8F0] bg-white px-4 py-5 lg:flex">
            <QuestionNavigator blocks={blocks} answers={answers} currentIndex={currentIndex} />
          </aside>

          {/*
            ── RIGHT PANEL ─────────────────────────────────────────────────
            flex flex-col min-h-0: stacks question-area + nav-bar vertically.
            min-h-0 is CRITICAL — without it flex children can exceed allocated height.
          */}
          <div className="flex min-h-0 flex-1 flex-col">

            {/*
              ── QUESTION AREA ──────────────────────────────────────────────
              flex-1 overflow-y-auto: grows to fill space, scrolls internally
              when question is taller than available height. The nav-bar below
              NEVER scrolls away — it's outside this div.
            */}
            <div ref={questionScrollRef} className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-6">

                {/* Breadcrumb / meta */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#1D4ED8]">
                    {block.section}
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    {block.kind === "triad" ? "Forced Choice" : block.kind === "likert" ? "Likert Scale" : "Multiple Choice"}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-[11px] text-[#94A3B8]">
                    {isCurrentAnswered && <CheckCircle2 size={12} className="text-emerald-500" />}
                    {currentIndex + 1} / {total}
                  </span>
                </div>

                {/* Question card */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:rounded-3xl sm:p-7">
                  {block.kind === "likert" && (
                    <LikertQuestion block={block} answers={answers} setAnswers={setAnswers} />
                  )}
                  {(block.kind === "item_mcq" || block.kind === "item_tf" || block.kind === "legacy_mcq") && (
                    <McqQuestion
                      block={block as Extract<TestBlock, { kind: "item_mcq" | "item_tf" | "legacy_mcq" }>}
                      answers={answers} setAnswers={setAnswers}
                    />
                  )}
                  {block.kind === "triad" && (
                    <TriadQuestion block={block} answers={answers} setAnswers={setAnswers} />
                  )}
                </div>

              </div>
            </div>
            {/* ↑ end question scroll area */}

            {/*
              ── NAVIGATION BAR ─────────────────────────────────────────────
              shrink-0: FIXED height, ALWAYS visible at the bottom.
              This is the key fix — it's a sibling of the scroll area,
              not a child, so it never gets pushed off screen.
            */}
            <div className="shrink-0 border-t border-[#E2E8F0] bg-white px-4 py-3 sm:px-6">
              {unansweredWarning && (
                <div className="mx-auto mb-2 flex max-w-2xl items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertCircle size={13} className="shrink-0 text-amber-600" />
                  <p className="text-xs font-medium text-amber-700">
                    {blocks[currentIndex]?.kind === "triad"
                      ? "Please select both a Most like me and a Least like me option before continuing."
                      : "Please answer this question before continuing."}
                  </p>
                </div>
              )}
              <div className="mx-auto flex max-w-2xl items-center gap-3">

                {/* Centre status */}
                <div className="flex flex-1 items-center gap-2">
                  {isCurrentAnswered ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 size={14} /> Answered
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                      <Flag size={13} /> Not answered
                    </span>
                  )}
                </div>

                {/* Next / Submit — Submit only shows on the very last question */}
                {currentIndex < total - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-1.5 rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E40AF]"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    Submit
                    <SendHorizonal size={14} />
                  </button>
                )}
              </div>
            </div>
            {/* ↑ end nav bar */}

          </div>
          {/* ↑ end right panel */}
        </div>
        {/* ↑ end body row */}
      </div>
    </>
  );
}

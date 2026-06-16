"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  FileText,
  Loader2,
  Check,
  Play,
  BookOpen,
  AlertTriangle,
  MonitorX,
} from "lucide-react";
import { CandidateTestRunner } from "./test-runner";
import type { TestBlock } from "@/lib/candidate-test-payload";

interface Props {
  assignmentId: string;
  blocks: TestBlock[];
  assessmentTitle?: string;
  candidateName?: string;
  durationMinutes: number;
  assessmentDurationMinutes?: number;
  durationIsOverridden?: boolean;
  activeAttemptId?: string;
  activeProgressData?: { answers?: Record<string, unknown>; remainingSeconds?: number; savedAt?: string } | null;
  activeStartedAt?: string;
}

function fmt(mins: number) {
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hour${h !== 1 ? "s" : ""}` : `${h}h ${m}m`;
}

const INSTRUCTIONS = [
  { heading: "Timer", text: 'The timer starts the moment you click "Start Assessment" and cannot be paused or extended. Ensure you are in a distraction-free environment before you begin.' },
  { heading: "One-way navigation", text: "Questions are presented one at a time in a fixed order. You cannot go back to a previous question. Moving forward without an answer records it as Skipped." },
  { heading: "Question types", text: "This assessment may include Likert Scale (rate 1–5), Forced Choice (select Most & Least like you), and Multiple Choice (one correct option) questions." },
  { heading: "Answer honestly", text: "For personality and behavioural questions there are no right or wrong answers. Respond based on how you truly think and act, not what you think the assessor wants to hear." },
  { heading: "Stay on the page", text: "Do not refresh, press back, or close the browser tab during the test. Doing so may result in loss of progress. Tab switching may be flagged and recorded." },
  { heading: "Single attempt", text: "Once you submit, your responses are final and cannot be revised. This assessment can only be attempted once per assignment." },
];

type SessionState = "checking" | "duplicate" | "fresh";

export function InstructionsGate({ assignmentId, blocks, assessmentTitle, candidateName, durationMinutes, assessmentDurationMinutes, durationIsOverridden, activeAttemptId, activeProgressData, activeStartedAt }: Props) {
  const [accepted, setAccepted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<Record<string, unknown> | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(activeStartedAt ?? null);
  const [sessionState, setSessionState] = useState<SessionState>(activeAttemptId ? "checking" : "fresh");

  // BroadcastChannel: detect if test is open in another tab, else auto-resume
  useEffect(() => {
    if (!activeAttemptId) return;

    let channel: BroadcastChannel | null = null;
    let resolved = false;

    const resolve = (state: "duplicate" | "resume") => {
      if (resolved) return;
      resolved = true;
      if (state === "resume") {
        const saved = (activeProgressData?.answers ?? null) as Record<string, unknown> | null;
        setSavedAnswers(saved);
        if (activeStartedAt) setStartedAt(activeStartedAt);
        setAttemptId(activeAttemptId);
      } else {
        setSessionState("duplicate");
      }
      try { channel?.close(); } catch { /* ignore */ }
    };

    try {
      channel = new BroadcastChannel(`test-session-${assignmentId}`);
      channel.onmessage = (e: MessageEvent) => {
        if ((e.data as { type?: string })?.type === "pong") resolve("duplicate");
      };
      channel.postMessage({ type: "ping" });
    } catch {
      // BroadcastChannel not supported — fall through to auto-resume
      resolve("resume");
      return;
    }

    const timeout = setTimeout(() => resolve("resume"), 800);
    return () => {
      clearTimeout(timeout);
      try { channel?.close(); } catch { /* ignore */ }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (attemptId) {
    return (
      <CandidateTestRunner
        assignmentId={assignmentId}
        attemptId={attemptId}
        blocks={blocks}
        assessmentTitle={assessmentTitle}
        candidateName={candidateName}
        durationMinutes={durationMinutes}
        savedAnswers={savedAnswers ?? undefined}
        startedAtIso={startedAt ?? undefined}
        savedRemainingSeconds={activeProgressData?.remainingSeconds}
        timerSavedAt={activeProgressData?.savedAt}
      />
    );
  }

  // Still pinging other tabs
  if (sessionState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-blue-600" />
          <p className="text-sm font-medium text-[#64748B]">Checking session…</p>
        </div>
      </div>
    );
  }

  // Duplicate tab detected
  if (sessionState === "duplicate") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] p-6">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <MonitorX size={30} className="text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">Test Already Open</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            This assessment is already running in another browser tab. To avoid losing your progress,
            please return to that tab to continue.
          </p>
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-700">
              Continuing here will run two sessions in parallel and may cause answers to overwrite each other.
            </p>
          </div>
          <div className="mt-5">
            <a
              href="/candidate"
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 text-center block"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const handleStart = async () => {
    setStartError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/candidate/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        attemptId?: string;
        progressData?: { answers?: Record<string, unknown> } | null;
        startedAt?: string | null;
        message?: string;
      };
      if (!res.ok || !data.attemptId) {
        setStartError(data.message ?? "Could not start the assessment. Please try again.");
        return;
      }
      if (data.progressData?.answers) {
        setSavedAnswers(data.progressData.answers);
      }
      if (data.startedAt) setStartedAt(data.startedAt);
      setAttemptId(data.attemptId);
      try { sessionStorage.setItem("activeAttemptId", data.attemptId); } catch { /* ignore */ }
    } catch {
      setStartError("Network error. Please check your connection and try again.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">

        {/* ── Header card ─────────────────────────────────────────────── */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500" />
          <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-4">
            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-500">
                Assessment Instructions
              </p>
              <h1 className="text-2xl font-extrabold leading-tight text-[#0F172A]">
                {assessmentTitle ?? "Assessment"}
              </h1>
              {candidateName && (
                <p className="mt-0.5 text-sm font-medium text-[#64748B]">{candidateName}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {durationMinutes > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <Clock size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">Duration</p>
                    <p className="text-base font-bold text-[#0F172A]">{fmt(durationMinutes)}</p>
                    {durationIsOverridden && assessmentDurationMinutes && (
                      <p className="text-[10px] text-amber-600 font-medium">
                        Assessment default: {fmt(assessmentDurationMinutes)}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                  <FileText size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">Questions</p>
                  <p className="text-base font-bold text-[#0F172A]">{blocks.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body: instructions + panel ───────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">

          {/* Single instructions card */}
          <div className="min-w-0 flex-1 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <div className="flex shrink-0 items-center gap-3 border-b border-[#F1F5F9] px-6 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <BookOpen size={18} className="text-blue-600" />
              </div>
              <h2 className="text-sm font-bold text-[#0F172A]">Before You Begin</h2>
            </div>
            <ol className="max-h-[360px] divide-y divide-[#F1F5F9] overflow-y-auto">
              {INSTRUCTIONS.map(({ heading, text }, i) => (
                <li key={heading} className="flex gap-4 px-6 py-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{heading}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-[#64748B]">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Ready to begin panel */}
          <div className="w-full lg:w-72 lg:shrink-0">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">

              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">
                <Play size={24} className="text-white" fill="white" />
              </div>

              <h3 className="text-lg font-bold text-[#0F172A]">Ready to begin?</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                Please confirm you&apos;ve read all instructions before starting your assessment.
              </p>

              <label className="mt-5 flex cursor-pointer items-start gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={accepted}
                  onClick={() => setAccepted((v) => !v)}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                    accepted
                      ? "border-blue-600 bg-blue-600"
                      : "border-[#CBD5E1] bg-white hover:border-blue-400"
                  }`}
                >
                  {accepted && <Check size={12} className="text-white" strokeWidth={3} />}
                </button>
                <p className="text-xs leading-relaxed text-[#475569]">
                  I have read and understood the instructions and agree to attempt this assessment honestly, without any external assistance.
                </p>
              </label>

              {startError && (
                <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  {startError}
                </p>
              )}

              <button
                type="button"
                disabled={!accepted || starting}
                onClick={() => void handleStart()}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
                  accepted && !starting
                    ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-md shadow-blue-200"
                    : "cursor-not-allowed bg-[#F1F5F9] text-[#94A3B8]"
                }`}
              >
                {starting ? (
                  <><Loader2 size={16} className="animate-spin" /> Starting…</>
                ) : (
                  <><Play size={15} fill="currentColor" /> Start Assessment</>
                )}
              </button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#94A3B8]">
                <Clock size={12} />
                Timer begins as soon as you start.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flag,
  Grid3X3,
  Loader2,
  SendHorizonal,
  X,
} from "lucide-react";
import type { TestBlock, CaseStudySubQuestion } from "@/lib/candidate-test-payload";

// ─── Types ───────────────────────────────────────────────────────────────────

type Answers = Record<
  string,
  number | string | string[] | { most: string; least: string } | Record<string, string | number | { most?: string; least?: string }> | undefined
>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Case-study sub-questions key their answer by itemId (mcq/likert) or groupId (triad) — the id that's stable for that sub-question's own type. */
function caseStudySubKey(sq: CaseStudySubQuestion): string {
  return sq.kind === "triad" ? sq.groupId : sq.itemId;
}

function isCaseStudySubAnswered(sq: CaseStudySubQuestion, subAnswers: Record<string, string | number | { most?: string; least?: string }>): boolean {
  const v = subAnswers[caseStudySubKey(sq)];
  if (sq.kind === "triad") {
    const t = v as { most?: string; least?: string } | undefined;
    return Boolean(t && t.most && t.least && t.most !== t.least);
  }
  return v !== undefined && v !== null && v !== "";
}

function isAnswered(block: TestBlock, answers: Answers): boolean {
  const v = answers[block.key];
  if (v === undefined || v === null) return false;
  if (block.kind === "triad") {
    const t = v as { most?: string; least?: string };
    return Boolean(t.most && t.least && t.most !== t.least);
  }
  if (block.kind === "case_study") {
    const subAnswers = v as Record<string, string | number | { most?: string; least?: string }>;
    return block.subQuestions.every((sq) => isCaseStudySubAnswered(sq, subAnswers));
  }
  if (block.kind === "item_mcq_multi") {
    return Array.isArray(v) && v.length > 0;
  }
  if (block.kind === "open_ended") {
    return typeof v === "string" && v.trim().length > 0;
  }
  return true;
}

/** How wide the question column gets, per type — split/grid layouts (MCQ with
 *  media, Triad's 3-across cards, Case Study's two panes) need the extra room;
 *  a single Likert scale or an open text box reads better narrower. */
function questionContainerMaxW(kind: TestBlock["kind"]): string {
  switch (kind) {
    case "case_study":
      return "max-w-7xl";
    case "item_mcq":
    case "item_tf":
    case "legacy_mcq":
    case "sjt":
    case "item_mcq_multi":
    case "triad":
      return "max-w-5xl";
    default:
      return "max-w-3xl";
  }
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

// initialSeconds  = where the countdown starts (may be 0 if time already ran out on resume)
// totalDurationSeconds = the full duration of this timed test (0 = untimed, never expires)
function useCountdownTimer(initialSeconds: number, totalDurationSeconds: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(Math.max(0, initialSeconds));
  const expiredRef = useRef(false);
  const cbRef = useRef(onExpire);
  const hasTimer = totalDurationSeconds > 0;
  const endTimeRef = useRef<number | null>(null);

  // keep callback ref up‑to‑date without rendering
  useEffect(() => {
    cbRef.current = onExpire;
  }, [onExpire]);

  // initialise / reset end time when initialSeconds changes (e.g. on resume)
  useEffect(() => {
    if (hasTimer && initialSeconds > 0) {
      endTimeRef.current = Date.now() + initialSeconds * 1000;
    }
  }, [hasTimer, initialSeconds]);

  useEffect(() => {
    if (!hasTimer) return; // untimed assessment — never expire

    // Tab was re-opened after the timer already ran out
    if (initialSeconds <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        setTimeout(() => cbRef.current(), 0);
      }
      return;
    }

    const id = setInterval(() => {
      const now = Date.now();
      const end = endTimeRef.current ?? now;
      const secs = Math.max(0, Math.ceil((end - now) / 1000));
      setRemaining(secs);
      if (secs <= 0) {
        clearInterval(id);
        if (!expiredRef.current) {
          expiredRef.current = true;
          setTimeout(() => cbRef.current(), 0);
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [hasTimer, initialSeconds]); // eslint-disable-line react-hooks/exhaustive-deps

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const isWarning = remaining < 10 * 60 && remaining > 3 * 60;
  const isCritical = remaining <= 3 * 60;
  return { mm, ss, isWarning, isCritical, remaining };
}

// ─── Timer pill ───────────────────────────────────────────────────────────────

function TimerPill({ mm, ss, isWarning, isCritical }: { mm: string; ss: string; isWarning: boolean; isCritical: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-sm font-bold tabular-nums transition-colors ${
      isCritical ? "border-rose-300 bg-rose-50 text-rose-600"
      : isWarning ? "border-amber-300 bg-amber-50 text-amber-600"
      : "border-teal-200 bg-teal-50 text-[#0F766E]"
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
                    ? "bg-[#0F766E] text-white shadow-sm"
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
          { cls: "bg-[#0F766E]", label: "Current" },
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

// ─── Question media (images + audio) ──────────────────────────────────────────
// Renders nothing when a block carries no media — every existing question type
// is unaffected until Phase B actually populates images/audioUrl on a block.

function QuestionMedia({ images, audioUrl }: { images?: string[]; audioUrl?: string | null }) {
  const hasImages = Boolean(images && images.length > 0);
  if (!hasImages && !audioUrl) return null;
  const count = images?.length ?? 0;
  // Fewer images means each one can afford to be much bigger — a single image
  // is the dominant thing on screen, three share the row more modestly.
  const gridColsClass = count <= 1 ? "grid-cols-1" : count === 2 ? "grid-cols-2" : "grid-cols-3";
  const imgHeightClass = count <= 1 ? "max-h-[36vh] lg:max-h-[54vh]" : count === 2 ? "max-h-[28vh] lg:max-h-[42vh]" : "max-h-[22vh] lg:max-h-[32vh]";
  return (
    <div className="mb-4 space-y-3">
      {hasImages && (
        <div className={`grid gap-3 ${gridColsClass}`}>
          {images!.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className={`w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] object-contain ${imgHeightClass}`} />
          ))}
        </div>
      )}
      {audioUrl && <audio controls src={audioUrl} className="w-full" />}
    </div>
  );
}

// Shared badge/title/subtitle text blocks — each layout below places these
// wherever fits its own split, so this stays just the text styling, no shell.
function QuestionBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={className ?? "inline-flex items-center rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]"}>
      {children}
    </span>
  );
}
function QuestionTitle({ children, hasBadge }: { children: ReactNode; hasBadge?: boolean }) {
  return <p className={`${hasBadge ? "mt-2" : ""} text-lg font-semibold leading-snug text-[#0F172A] sm:text-xl`}>{children}</p>;
}
function QuestionSubtitle({ children }: { children: ReactNode }) {
  return <div className="mt-1 text-sm text-[#64748B]">{children}</div>;
}

// ─── Likert (horizontal scale, compact) ──────────────────────────────────────

const LIKERT_OPTS = [
  { value: 1, label: "Not like me" },
  { value: 2, label: "Less like me" },
  { value: 3, label: "Somewhat like me" },
  { value: 4, label: "Almost like me" },
  { value: 5, label: "Just like me" },
];

/** Known opposite-intensity word families, keyed by their core word once a
 *  leading intensity modifier ("Strongly", "Very", ...) is stripped — covers
 *  every LikertScale actually configured in this product (plain agree/disagree
 *  and satisfaction scales). Candidates never see 1/2/3/4/5: those numbers only
 *  exist for internal scoring, so every point on the scale needs a real word. */
const INTENSITY_FAMILIES: { minCore: string; maxCore: string; ladder3: string[]; ladder5: string[]; ladder7: string[] }[] = [
  {
    minCore: "disagree", maxCore: "agree",
    ladder3: ["Disagree", "Neutral", "Agree"],
    ladder5: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    ladder7: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
  },
  {
    minCore: "dissatisfied", maxCore: "satisfied",
    ladder3: ["Dissatisfied", "Neutral", "Satisfied"],
    ladder5: ["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"],
    ladder7: ["Very Dissatisfied", "Dissatisfied", "Somewhat Dissatisfied", "Neutral", "Somewhat Satisfied", "Satisfied", "Very Satisfied"],
  },
];
const INTENSITY_MODIFIERS = new Set(["strongly", "very", "extremely", "somewhat", "slightly", "moderately"]);

function coreWord(label: string): string {
  const words = label.trim().toLowerCase().split(/\s+/);
  return words.length > 1 && INTENSITY_MODIFIERS.has(words[0]) ? words.slice(1).join(" ") : words.join(" ");
}

function findWordLadder(minLabel: string, maxLabel: string, count: number): string[] | null {
  const family = INTENSITY_FAMILIES.find((f) => f.minCore === coreWord(minLabel) && f.maxCore === coreWord(maxLabel));
  if (!family) return null;
  if (count === 3) return family.ladder3;
  if (count === 5) return family.ladder5;
  if (count === 7) return family.ladder7;
  return null;
}

/** Generates a fully-worded N-point scale from a custom min/max — used only for Survey
 *  Likert items and Case Study Likert sub-questions with a configured scale; every legacy
 *  Psychometric item has no scale and keeps the fixed LIKERT_OPTS above untouched. Points
 *  between the two admin-authored ends get real wording too (via the word ladder above for
 *  a recognized family, or minLabel/maxLabel/"Neutral" split by proximity otherwise) —
 *  never a bare number standing in for a missing label. */
function buildScaleOpts(scale: { min: number; max: number; minLabel: string; maxLabel: string }) {
  const count = scale.max - scale.min + 1;
  const ladder = findWordLadder(scale.minLabel, scale.maxLabel, count);
  const mid = (scale.min + scale.max) / 2;
  const opts: { value: number; label: string }[] = [];
  let i = 0;
  for (let v = scale.min; v <= scale.max; v++, i++) {
    const label = ladder
      ? ladder[i]
      : v === scale.min
        ? scale.minLabel
        : v === scale.max
          ? scale.maxLabel
          : v === mid
            ? "Neutral"
            : v < mid
              ? scale.minLabel
              : scale.maxLabel;
    opts.push({ value: v, label });
  }
  return opts;
}

/** The scale-button UI shared by standalone Likert questions and Likert
 *  case-study sub-questions — pulled out so both call sites stay identical.
 *  Styled to match the MCQ option rows (letter badge, full-width row, check
 *  icon on select) rather than a boxed 1-5 scale, for a consistent look
 *  across every question type. */
/** Vertical list on phones (narrow, so a horizontal scale would cramp the words);
 *  a single full-width segmented row on lg+, since a 5-point scale is short enough
 *  to lay out horizontally once there's room, and that reads as a proper Likert
 *  scale instead of five stacked rows eating vertical space for no reason. */
function LikertScaleButtons({ value, scale, onChange }: {
  value: number | undefined;
  scale?: { min: number; max: number; minLabel: string; maxLabel: string };
  onChange: (v: number) => void;
}) {
  const opts = scale ? buildScaleOpts(scale) : LIKERT_OPTS;
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:gap-3">
      {opts.map((opt, idx) => {
        const sel = value === opt.value;
        const letter = String.fromCharCode(65 + idx);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`group flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all lg:flex-1 lg:flex-col lg:justify-center lg:gap-2 lg:px-3 lg:py-5 lg:text-center ${
              sel ? "border-[#0F766E] bg-[#E6F7F1]" : "border-[#E2E8F0] bg-white hover:border-[#6EE7B7] hover:bg-[#F8FAFC]"
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
              sel ? "bg-[#0F766E] text-white" : "bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#D1FAE5] group-hover:text-[#0F766E]"
            }`}>
              {letter}
            </span>
            <span className={`text-sm font-medium ${sel ? "text-[#0D9488]" : "text-[#334155]"}`}>{opt.label}</span>
            {sel && <CheckCircle2 size={16} className="ml-auto shrink-0 text-[#0F766E] lg:ml-0" />}
          </button>
        );
      })}
    </div>
  );
}

function LikertLayout({ block, answers, setAnswers }: {
  block: Extract<TestBlock, { kind: "likert" }>;
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
}) {
  const val = answers[block.key] as number | undefined;
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
      <QuestionMedia images={block.images} audioUrl={block.audioUrl} />
      <QuestionTitle>{block.prompt}</QuestionTitle>
      <QuestionSubtitle>
        {block.scale ? "Select the option that best reflects your response." : "Rate how much the statement above describes you."}
      </QuestionSubtitle>
      <div className="mt-5">
        <LikertScaleButtons value={val} scale={block.scale} onChange={(v) => setAnswers((a) => ({ ...a, [block.key]: v }))} />
      </div>
    </div>
  );
}

// ─── MCQ ─────────────────────────────────────────────────────────────────────

type McqOption = { id: string; label: string; imageUrl?: string };

/** Single-select option list. When any option carries its own image, this switches
 *  to a card grid with the image as the dominant element (big enough to actually
 *  compare, not a thumbnail) instead of a stacked list of tiny icons. */
function McqOptionsList({ options, value, onSelect, twoColText }: {
  options: McqOption[];
  value: unknown;
  onSelect: (id: string) => void;
  /** Only meaningful for the plain-text (no-image) list — lets short option sets use the width instead of stacking. */
  twoColText?: boolean;
}) {
  const hasImages = options.some((o) => o.imageUrl);

  if (hasImages) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((opt, idx) => {
          const sel = value === opt.id;
          const letter = String.fromCharCode(65 + idx);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all ${
                sel ? "border-[#0F766E] bg-[#E6F7F1]" : "border-[#E2E8F0] bg-white hover:border-[#6EE7B7] hover:bg-[#F8FAFC]"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                  sel ? "bg-[#0F766E] text-white" : "bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#D1FAE5] group-hover:text-[#0F766E]"
                }`}>
                  {letter}
                </span>
                {sel && <CheckCircle2 size={16} className="shrink-0 text-[#0F766E]" />}
              </div>
              {opt.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={opt.imageUrl} alt="" className="h-40 w-full rounded-lg border border-[#E2E8F0] bg-white object-contain p-1 sm:h-48" />
              )}
              <span className={`text-sm font-medium ${sel ? "text-[#0D9488]" : "text-[#334155]"}`}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`grid gap-2 ${twoColText ? "sm:grid-cols-2" : ""}`}>
      {options.map((opt, idx) => {
        const sel = value === opt.id;
        const letter = String.fromCharCode(65 + idx);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`group flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
              sel ? "border-[#0F766E] bg-[#E6F7F1]" : "border-[#E2E8F0] bg-white hover:border-[#6EE7B7] hover:bg-[#F8FAFC]"
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
              sel ? "bg-[#0F766E] text-white" : "bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#D1FAE5] group-hover:text-[#0F766E]"
            }`}>
              {letter}
            </span>
            <span className={`text-sm font-medium ${sel ? "text-[#0D9488]" : "text-[#334155]"}`}>{opt.label}</span>
            {sel && <CheckCircle2 size={16} className="ml-auto shrink-0 text-[#0F766E]" />}
          </button>
        );
      })}
    </div>
  );
}

function McqLayout({ block, answers, setAnswers }: {
  block: Extract<TestBlock, { kind: "item_mcq" | "item_tf" | "legacy_mcq" | "sjt" }>;
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
}) {
  const options: McqOption[] =
    block.kind === "legacy_mcq"
      ? block.options.map((o) => ({ id: String(o.value), label: o.label }))
      : block.options.map((o) => ({ id: o.optionId, label: o.label, imageUrl: o.imageUrl ?? undefined }));
  const val = block.kind === "legacy_mcq" ? String(answers[block.key] ?? "") : answers[block.key];
  const prompt = block.kind === "legacy_mcq" ? block.questionText : block.prompt;
  const media = block.kind !== "legacy_mcq" ? { images: block.images, audioUrl: block.audioUrl } : {};
  const hasMedia = Boolean(media.images?.length || media.audioUrl);
  const onSelect = (id: string) =>
    setAnswers((a) => ({ ...a, [block.key]: block.kind === "legacy_mcq" ? Number(id) : id }));

  if (hasMedia) {
    return (
      <div className="grid gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:h-full lg:min-h-0 lg:overflow-y-auto">
          {block.kind === "sjt" && <QuestionBadge>Situational Judgment</QuestionBadge>}
          <QuestionMedia images={media.images} audioUrl={media.audioUrl} />
          <QuestionTitle hasBadge={block.kind === "sjt"}>{prompt}</QuestionTitle>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:h-full lg:min-h-0 lg:overflow-y-auto">
          <McqOptionsList options={options} value={val} onSelect={onSelect} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
      {block.kind === "sjt" && <QuestionBadge>Situational Judgment</QuestionBadge>}
      <QuestionTitle hasBadge={block.kind === "sjt"}>{prompt}</QuestionTitle>
      <div className="mt-4">
        <McqOptionsList options={options} value={val} onSelect={onSelect} twoColText={options.length >= 4} />
      </div>
    </div>
  );
}

// ─── MCQ multi-select ──────────────────────────────────────────────────────────

type OptionWithImageForRender = { optionId: string; label: string; imageUrl?: string | null };

function McqMultiOptionsList({ options, selected, onToggle }: {
  options: OptionWithImageForRender[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const hasImages = options.some((o) => o.imageUrl);
  const twoCol = hasImages || options.length >= 4;
  return (
    <div className={`grid gap-2 ${twoCol ? "grid-cols-1 sm:grid-cols-2" : ""}`}>
      {options.map((opt, idx) => {
        const sel = selected.includes(opt.optionId);
        const letter = String.fromCharCode(65 + idx);
        return (
          <button
            key={opt.optionId}
            type="button"
            onClick={() => onToggle(opt.optionId)}
            className={`group flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
              hasImages ? "flex-col text-center" : ""
            } ${sel ? "border-[#0F766E] bg-[#E6F7F1]" : "border-[#E2E8F0] bg-white hover:border-[#6EE7B7] hover:bg-[#F8FAFC]"}`}
          >
            <div className={`flex items-center gap-3 ${hasImages ? "w-full justify-between" : ""}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold transition-all ${
                sel ? "border-[#0F766E] bg-[#0F766E] text-white" : "border-[#CBD5E1] bg-white text-transparent group-hover:border-[#6EE7B7]"
              }`}>
                {sel && <Check size={13} strokeWidth={3} />}
              </span>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                sel ? "bg-[#0F766E] text-white" : "bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#D1FAE5] group-hover:text-[#0F766E]"
              }`}>
                {letter}
              </span>
            </div>
            {opt.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={opt.imageUrl} alt="" className="h-40 w-full rounded-lg border border-[#E2E8F0] bg-white object-contain p-1 sm:h-48" />
            )}
            <span className={`text-sm font-medium ${sel ? "text-[#0D9488]" : "text-[#334155]"}`}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function McqMultiLayout({ block, answers, setAnswers }: {
  block: Extract<TestBlock, { kind: "item_mcq_multi" }>;
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
}) {
  const selected = (answers[block.key] as string[] | undefined) ?? [];
  const toggle = (id: string) =>
    setAnswers((a) => {
      const prev = (a[block.key] as string[] | undefined) ?? [];
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return { ...a, [block.key]: next };
    });
  const hasMedia = Boolean(block.images?.length || block.audioUrl);

  if (hasMedia) {
    return (
      <div className="grid gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:h-full lg:min-h-0 lg:overflow-y-auto">
          <QuestionBadge>Select all that apply</QuestionBadge>
          <QuestionMedia images={block.images} audioUrl={block.audioUrl} />
          <QuestionTitle hasBadge>{block.prompt}</QuestionTitle>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:h-full lg:min-h-0 lg:overflow-y-auto">
          <McqMultiOptionsList options={block.options} selected={selected} onToggle={toggle} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
      <QuestionBadge>Select all that apply</QuestionBadge>
      <QuestionTitle hasBadge>{block.prompt}</QuestionTitle>
      <div className="mt-4">
        <McqMultiOptionsList options={block.options} selected={selected} onToggle={toggle} />
      </div>
    </div>
  );
}

// ─── Open-Ended ─────────────────────────────────────────────────────────────────

function OpenEndedLayout({ block, answers, setAnswers }: {
  block: Extract<TestBlock, { kind: "open_ended" }>;
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
}) {
  const val = (answers[block.key] as string | undefined) ?? "";
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
      <QuestionBadge className="inline-flex w-fit items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
        Open-Ended
      </QuestionBadge>
      <QuestionMedia images={block.images} audioUrl={block.audioUrl} />
      <QuestionTitle hasBadge>{block.prompt}</QuestionTitle>
      {block.helpText && <QuestionSubtitle>{block.helpText}</QuestionSubtitle>}
      <textarea
        value={val}
        onChange={(e) => setAnswers((a) => ({ ...a, [block.key]: e.target.value }))}
        placeholder="Type your answer here…"
        className="mt-4 w-full flex-1 min-h-[200px] resize-none rounded-xl border-2 border-[#E2E8F0] px-4 py-3 text-sm text-[#334155] placeholder:text-[#94A3B8] transition-all focus:border-[#0F766E] focus:outline-none"
      />
    </div>
  );
}

// ─── Triad ────────────────────────────────────────────────────────────────────

const LETTERS = ["A", "B", "C", "D", "E"];

/** The most/least statement-card UI shared by standalone Triad questions and
 *  Triad case-study sub-questions — pulled out so both call sites stay identical. */
/** `layout="grid"` (the standalone Triad question, with room to spare) lays the
 *  three statements out side by side instead of stacked, each card the same
 *  height with its Most/Least buttons pinned to the bottom. `layout="stack"`
 *  (the default, used inside a Case Study's narrower sub-question pane) keeps
 *  the original vertical list. */
function TriadStatementCards({ statements, value, onMost, onLeast, layout = "stack" }: {
  statements: { id: string; text: string }[];
  value: { most?: string; least?: string };
  onMost: (id: string) => void;
  onLeast: (id: string) => void;
  layout?: "stack" | "grid";
}) {
  const tv = value;
  return (
    <div className="space-y-3">
      {/* Selection status bar */}
      <div className="flex gap-2">
        <div className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-1.5 text-xs font-semibold transition-all ${
          tv.most ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-dashed border-[#CBD5E1] text-[#94A3B8]"
        }`}>
          <CheckCircle2 size={13} />
          {tv.most ? `Most: ${LETTERS[statements.findIndex((s) => s.id === tv.most)] ?? "?"}` : "Select Most"}
        </div>
        <div className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-1.5 text-xs font-semibold transition-all ${
          tv.least ? "border-rose-300 bg-rose-50 text-rose-600" : "border-dashed border-[#CBD5E1] text-[#94A3B8]"
        }`}>
          <X size={13} />
          {tv.least ? `Least: ${LETTERS[statements.findIndex((s) => s.id === tv.least)] ?? "?"}` : "Select Least"}
        </div>
      </div>

      {/* Statement cards */}
      <div className={layout === "grid" ? "grid gap-3 lg:grid-cols-3" : "space-y-1.5"}>
        {statements.map((s, idx) => {
          const isMost = tv.most === s.id;
          const isLeast = tv.least === s.id;
          const letter = LETTERS[idx] ?? String(idx + 1);
          return (
            <div key={s.id} className={`flex flex-col overflow-hidden rounded-2xl border-2 transition-all ${
              isMost ? "border-emerald-400 bg-emerald-50/60"
              : isLeast ? "border-rose-300 bg-rose-50/60"
              : "border-[#E2E8F0] bg-white"
            }`}>
              <div className="flex flex-1 items-start gap-3 px-4 py-2.5">
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
                  onClick={() => onMost(s.id)}
                  disabled={isLeast}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-all ${
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
                  onClick={() => onLeast(s.id)}
                  disabled={isMost}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-all ${
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

function TriadLayout({ block, answers, setAnswers }: {
  block: Extract<TestBlock, { kind: "triad" }>;
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
}) {
  const tv = (answers[block.key] as { most?: string; least?: string }) ?? {};
  const setMost = (id: string) => setAnswers((a) => ({ ...a, [block.key]: { most: id, least: tv.least === id ? "" : (tv.least ?? "") } }));
  const setLeast = (id: string) => setAnswers((a) => ({ ...a, [block.key]: { most: tv.most === id ? "" : (tv.most ?? ""), least: id } }));

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
      <QuestionTitle>{block.title}</QuestionTitle>
      <QuestionSubtitle>
        Below are three ways to complete this statement. Choose the one that is <span className="font-semibold text-emerald-600">Most like you</span> and the one that is <span className="font-semibold text-rose-500">Least like you</span>.
      </QuestionSubtitle>
      <div className="mt-4">
        <TriadStatementCards statements={block.statements} value={tv} onMost={setMost} onLeast={setLeast} layout="grid" />
      </div>
    </div>
  );
}

// ─── Case Study ────────────────────────────────────────────────────────────

type CaseStudySubAnswers = Record<string, string | number | { most?: string; least?: string }>;

/** Case Study: on lg+ the passage is pinned in its own left-hand pane at full
 *  height (own scroll only if the passage itself runs long) while the
 *  sub-questions scroll independently in the right-hand pane — the passage
 *  never leaves view while answering. Below lg there isn't width for a split,
 *  so it falls back to the original stacked layout: a bounded, scrollable
 *  passage box on top, sub-questions below in the page's normal scroll. */
function CaseStudyLayout({ block, answers, setAnswers }: {
  block: Extract<TestBlock, { kind: "case_study" }>;
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
}) {
  const subAnswers = (answers[block.key] as CaseStudySubAnswers) ?? {};
  const setSubAnswer = (key: string, value: string | number | { most?: string; least?: string }) =>
    setAnswers((a) => ({
      ...a,
      [block.key]: { ...((a[block.key] as CaseStudySubAnswers) ?? {}), [key]: value },
    }));

  return (
    <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-6">
      {/* Passage pane — pinned on lg+, bounded box on mobile */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
        <QuestionBadge className="inline-flex w-fit items-center rounded-full bg-[#FDF4FF] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#A21CAF]">
          Case Study
        </QuestionBadge>
        <QuestionTitle hasBadge>{block.title}</QuestionTitle>
        <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border-2 border-[#E2E8F0] bg-[#F8FAFC] p-4 lg:max-h-none lg:min-h-0 lg:flex-1">
          <p className="whitespace-pre-line text-sm leading-relaxed text-[#334155]">{block.passageText}</p>
        </div>
      </div>

      {/* Sub-questions pane — scrolls independently of the passage on lg+ */}
      <div className="space-y-5 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:h-full lg:min-h-0 lg:overflow-y-auto">
        {block.subQuestions.map((sq, qIdx) => {
          const key = caseStudySubKey(sq);
          return (
            <div key={key} className="space-y-2 border-b border-[#F1F5F9] pb-5 last:border-0 last:pb-0">
              <QuestionMedia images={sq.images} audioUrl={sq.audioUrl} />
              <p className="text-sm font-semibold text-[#0F172A]">
                {qIdx + 1}. {sq.kind === "triad" ? sq.title : sq.prompt}
              </p>

              {sq.kind === "mcq" && (
                <McqOptionsList
                  options={sq.options.map((o) => ({ id: o.optionId, label: o.label, imageUrl: o.imageUrl ?? undefined }))}
                  value={subAnswers[key]}
                  onSelect={(id) => setSubAnswer(key, id)}
                />
              )}

              {sq.kind === "likert" && (
                <LikertScaleButtons
                  value={subAnswers[key] as number | undefined}
                  scale={sq.scale}
                  onChange={(v) => setSubAnswer(key, v)}
                />
              )}

              {sq.kind === "triad" && (
                <TriadStatementCards
                  statements={sq.statements}
                  value={(subAnswers[key] as { most?: string; least?: string } | undefined) ?? {}}
                  onMost={(id) => {
                    const tv = (subAnswers[key] as { most?: string; least?: string } | undefined) ?? {};
                    setSubAnswer(key, { most: id, least: tv.least === id ? "" : (tv.least ?? "") });
                  }}
                  onLeast={(id) => {
                    const tv = (subAnswers[key] as { most?: string; least?: string } | undefined) ?? {};
                    setSubAnswer(key, { most: tv.most === id ? "" : (tv.most ?? ""), least: id });
                  }}
                />
              )}
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
          className="mt-6 w-full rounded-xl bg-[#0F766E] py-3 text-sm font-semibold text-white transition hover:bg-[#0D9488] disabled:opacity-60">
          {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Submitting…</span> : "Submit My Responses"}
        </button>
      </div>
    </div>
  );
}

const MODULE_LABELS: Record<string, string> = {
  PSYCHOMETRIC: "Psychometric",
  TECHNICAL: "Technical",
  SURVEY: "Survey",
};

type NextModuleInfo = { assignmentId: string; accessToken: string; moduleType: string; title: string };

function ModuleTransitionOverlay({
  currentModuleType,
  nextModule,
}: {
  currentModuleType?: string;
  nextModule: NextModuleInfo;
}) {
  const nextHref = `/candidate/test/${nextModule.assignmentId}?token=${nextModule.accessToken}`;
  const currentLabel = currentModuleType ? MODULE_LABELS[currentModuleType] ?? currentModuleType : null;
  const nextLabel = MODULE_LABELS[nextModule.moduleType] ?? nextModule.moduleType;

  useEffect(() => {
    const id = setTimeout(() => {
      window.location.href = nextHref;
    }, 4000);
    return () => clearTimeout(id);
  }, [nextHref]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 size={30} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-[#0F172A]">
          {currentLabel ? `${currentLabel} module complete!` : "Module complete!"}
        </h2>
        <p className="mt-2 text-sm text-[#64748B]">
          You&apos;re now continuing to the <span className="font-semibold text-[#0F172A]">{nextLabel} module</span>.
        </p>
        <button
          type="button"
          onClick={() => { window.location.href = nextHref; }}
          className="mt-6 w-full rounded-xl bg-[#0F766E] py-3 text-sm font-semibold text-white transition hover:bg-[#0D9488]"
        >
          Continue now
        </button>
      </div>
    </div>
  );
}

function SubmittingOverlay({ done }: { done?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        {done ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 size={30} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">Thank You!</h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Your responses have been submitted successfully. You may now close this window.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F7F1]">
              <Loader2 size={30} className="animate-spin text-[#0F766E]" />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">Submitting Your Responses</h2>
            <p className="mt-2 text-sm text-[#64748B]">Please wait while your answers are being saved…</p>
          </>
        )}
      </div>
    </div>
  );
}

type TimerWarningKind = "one_minute" | "ten_seconds";

function TimerWarningToast({ kind, onDismiss }: { kind: TimerWarningKind; onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 6000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  const isOneMin = kind === "one_minute";
  return (
    <div className={`fixed left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-5 py-3 shadow-xl backdrop-blur-sm transition-all ${
      isOneMin
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-rose-300 bg-rose-50 text-rose-800"
    }`}>
      <AlertCircle size={17} className="shrink-0" />
      <p className="text-sm font-semibold">
        {isOneMin ? "Only 1 minute remaining!" : "Only 10 seconds left!"}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-1 rounded-full p-0.5 opacity-60 hover:opacity-100"
      >
        <X size={13} />
      </button>
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
  accessToken: string,
  answers: Answers,
  skipped: Set<number>,
  blocks: TestBlock[],
  remainingSeconds?: number,
) {
  try {
    const skippedKeys = [...skipped].map((i) => blocks[i]?.key).filter(Boolean);
    await fetch(`/api/candidate/attempts/${attemptId}/autosave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, skippedKeys, remainingSeconds, token: accessToken }),
      credentials: "same-origin",
    });
  } catch {
    // best-effort — ignore
  }
}

// Derive the index of the first unanswered block, given a set of saved answers
function firstUnansweredIndex(blocks: TestBlock[], saved: Answers): number {
  const idx = blocks.findIndex((b) => !isAnswered(b, saved));
  return idx === -1 ? blocks.length - 1 : idx;
}

export function CandidateTestRunner({
  assignmentId, accessToken, blocks, assessmentTitle, candidateName, moduleType, durationMinutes, attemptId, savedAnswers, initialRemainingSeconds,
}: {
  assignmentId: string;
  accessToken: string;
  blocks: TestBlock[];
  assessmentTitle?: string;
  candidateName?: string;
  moduleType?: string;
  durationMinutes?: number;
  attemptId?: string;
  savedAnswers?: Record<string, unknown>;
  initialRemainingSeconds: number;
}) {
  const initialAnswers = (savedAnswers ?? {}) as Answers;
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [currentIndex, setCurrentIndex] = useState(() =>
    savedAnswers ? firstUnansweredIndex(blocks, savedAnswers as Answers) : 0
  );
  const [loading, setLoading] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [nextModule, setNextModule] = useState<NextModuleInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timesUp, setTimesUp] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [unansweredWarning, setUnansweredWarning] = useState(false);
  const [timerWarning, setTimerWarning] = useState<TimerWarningKind | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  // Prevents double-click from advancing two questions at once
  const navLockRef = useRef(false);
  // Keeps the latest remaining seconds so event-handler effects always save the correct value
  const remainingRef = useRef(0);
  const oneMinWarned = useRef(false);
  const tenSecWarned = useRef(false);

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

  // Keep answers in a ref so event listeners always see the latest value
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Debounced auto-save (1.5s after each answer change)
  useEffect(() => {
    if (!attemptId) return;
    const id = setTimeout(() => {
      void autosave(attemptId, accessToken, answersRef.current, new Set(), blocks, remainingRef.current);
    }, 1500);
    return () => clearTimeout(id);
  }, [answers, attemptId, blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic auto-save every 15 seconds — guards against idle sessions with no answer changes
  useEffect(() => {
    if (!attemptId) return;
    const id = setInterval(() => {
      void autosave(attemptId, accessToken, answersRef.current, new Set(), blocks, remainingRef.current);
    }, 15_000);
    return () => clearInterval(id);
  }, [attemptId, blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // BroadcastChannel: respond to pings from duplicate tabs so they can detect this session is active
  useEffect(() => {
    if (!attemptId) return;
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(`test-session-${assignmentId}`);
      channel.onmessage = (e: MessageEvent) => {
        if ((e.data as { type?: string })?.type === "ping") {
          channel!.postMessage({ type: "pong" });
        }
      };
    } catch {
      // BroadcastChannel not supported — skip
    }
    return () => {
      try { channel?.close(); } catch { /* ignore */ }
    };
  }, [attemptId, assignmentId]);

  // Retry save immediately when the browser comes back online after a connection drop
  useEffect(() => {
    if (!attemptId) return;
    const handleOnline = () => {
      void autosave(attemptId, accessToken, answersRef.current, new Set(), blocks, remainingRef.current);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [attemptId, blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show/hide offline warning banner.
  // The browser's online/offline events only detect the network *interface* going down —
  // "connected to Wi-Fi with no working internet" never fires them. So alongside those events
  // (for instant feedback on an obvious disconnect) we actively probe the server periodically
  // and treat a failed/timed-out ping as offline too.
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    let cancelled = false;
    const probe = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch("/api/ping", { cache: "no-store", signal: controller.signal });
        clearTimeout(timeout);
        if (!cancelled) setIsOffline(false);
      } catch {
        if (!cancelled) setIsOffline(true);
      }
    };
    void probe();
    const intervalId = setInterval(probe, 10_000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Reliable save on tab close / power off via sendBeacon
  useEffect(() => {
    if (!attemptId) return;
    const handleUnload = () => {
      const payload = JSON.stringify({ answers: answersRef.current, skippedKeys: [], remainingSeconds: remainingRef.current, trigger: "beforeunload", token: accessToken });
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
    if (!navigator.onLine) {
      setError("You are offline. Please restore your internet connection before submitting.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/candidate/demo-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, answers, skippedKeys: [], submissionType, token: accessToken }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; resultId?: string; error?: string; nextModule?: NextModuleInfo | null };
      if (!res.ok || !data.ok || typeof data.resultId !== "string") {
        setError(typeof data.error === "string" && data.error.length > 0 ? data.error : `Request failed (${res.status})`);
        setLoading(false);
        return;
      }
      try { sessionStorage.removeItem("activeAttemptId"); } catch { /* ignore */ }
      setNextModule(data.nextModule ?? null);
      setSubmitDone(true);
    } catch {
      setError("Your internet connection was interrupted and the submission could not be sent. Please check your connection and try again.");
      setLoading(false);
    }
  }, [assignmentId, accessToken, answers, skipped, blocks]);

  const handleTimesUp = useCallback(() => {
    setTimesUp(true);
    void handleSubmit("TIMED_OUT");
  }, [handleSubmit]);

  const effectiveDuration = (durationMinutes && durationMinutes > 0) ? durationMinutes : 0;
  // initialRemainingSeconds is computed server-side from the attempt's immutable `startedAt`
  // anchor (see candidate/test/[assignmentId]/page.tsx and /api/candidate/attempts/start) —
  // never from a client-ticked snapshot, so it can only ever count down, never jump back up.
  const { mm, ss, isWarning, isCritical, remaining } = useCountdownTimer(initialRemainingSeconds, effectiveDuration * 60, handleTimesUp);
  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  // Timer warnings: 1 min (only for tests > 5 min total) and 10 sec
  useEffect(() => {
    if (effectiveDuration === 0) return;
    if (remaining === 60 && effectiveDuration > 5 && !oneMinWarned.current) {
      oneMinWarned.current = true;
      setTimerWarning("one_minute");
    } else if (remaining === 10 && !tenSecWarned.current) {
      tenSecWarned.current = true;
      setTimerWarning("ten_seconds");
    }
  }, [remaining, effectiveDuration]);

  const handleNext = useCallback(() => {
    if (navLockRef.current) return;
    if (!isAnswered(blocks[currentIndex], answers)) {
      setUnansweredWarning(true);
      setTimeout(() => setUnansweredWarning(false), 2500);
      return;
    }
    navLockRef.current = true;

    if (attemptId) {
      void autosave(attemptId, accessToken, answers, new Set(), blocks, remainingRef.current);
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
      {(loading || timesUp) && (
        submitDone && nextModule
          ? <ModuleTransitionOverlay currentModuleType={moduleType} nextModule={nextModule} />
          : <SubmittingOverlay done={submitDone} />
      )}
      {timerWarning && !loading && !timesUp && (
        <TimerWarningToast kind={timerWarning} onDismiss={() => setTimerWarning(null)} />
      )}
      {isOffline && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          <span>⚠</span>
          <span>No internet connection — your answers are saved locally. Submission will resume once you&apos;re back online.</span>
        </div>
      )}
      {navOpen && (
        <MobileNavDrawer blocks={blocks} answers={answers} currentIndex={currentIndex}
          onClose={() => setNavOpen(false)} />
      )}

      {/*
        ROOT: h-full forces the container to fit the parent exactly.
        flex-col stacks: [sub-header] + [body].
      */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#F8FAFC]">

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
            <div className="h-full bg-gradient-to-r from-[#0F766E] to-[#10B981] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/*
          ── BODY ROW ───────────────────────────────────────────────────────
          flex-1 + min-h-0: takes all remaining height, flex children can't overflow.
        */}
        <div className="flex min-h-0 flex-1">

          {/*
            ── MAIN PANEL ──────────────────────────────────────────────────
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
            <div
              ref={questionScrollRef}
              className={`flex-1 ${block.kind === "case_study" ? "overflow-y-auto lg:overflow-hidden" : "overflow-y-auto"}`}
            >
              <div className={`mx-auto flex h-full min-h-0 w-full flex-col px-4 py-4 sm:px-6 sm:py-5 ${questionContainerMaxW(block.kind)}`}>

                {/* Breadcrumb / meta */}
                <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
                  <span className="ml-auto flex items-center gap-1 text-[11px] text-[#94A3B8]">
                    {isCurrentAnswered && <CheckCircle2 size={12} className="text-emerald-500" />}
                    {currentIndex + 1} / {total}
                  </span>
                </div>

                {/* Type-specific layout: each kind lays out its own media/prompt/controls
                    the way that suits it best, rather than forcing one shared shape. */}
                <div className="min-h-0 flex-1">
                  {block.kind === "likert" && (
                    <LikertLayout block={block} answers={answers} setAnswers={setAnswers} />
                  )}
                  {(block.kind === "item_mcq" || block.kind === "item_tf" || block.kind === "legacy_mcq" || block.kind === "sjt") && (
                    <McqLayout
                      block={block as Extract<TestBlock, { kind: "item_mcq" | "item_tf" | "legacy_mcq" | "sjt" }>}
                      answers={answers} setAnswers={setAnswers}
                    />
                  )}
                  {block.kind === "item_mcq_multi" && (
                    <McqMultiLayout block={block} answers={answers} setAnswers={setAnswers} />
                  )}
                  {block.kind === "open_ended" && (
                    <OpenEndedLayout block={block} answers={answers} setAnswers={setAnswers} />
                  )}
                  {block.kind === "triad" && (
                    <TriadLayout block={block} answers={answers} setAnswers={setAnswers} />
                  )}
                  {block.kind === "case_study" && (
                    <CaseStudyLayout block={block} answers={answers} setAnswers={setAnswers} />
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
                <div className="mx-auto mb-2 flex max-w-5xl items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertCircle size={13} className="shrink-0 text-amber-600" />
                  <p className="text-xs font-medium text-amber-700">
                    {blocks[currentIndex]?.kind === "triad"
                      ? "Please select both a Most like me and a Least like me option before continuing."
                      : blocks[currentIndex]?.kind === "case_study"
                        ? "Please answer all questions in this case study before continuing."
                        : "Please answer this question before continuing."}
                  </p>
                </div>
              )}
              <div className="mx-auto flex max-w-5xl items-center gap-3">

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
                    className="flex items-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0D9488]"
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
          {/* ↑ end main panel */}

          {/* ── Right navigator (desktop only, read-only) ── */}
          <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto border-l border-[#E2E8F0] bg-white px-4 py-5 lg:flex">
            <QuestionNavigator blocks={blocks} answers={answers} currentIndex={currentIndex} />
          </aside>
        </div>
        {/* ↑ end body row */}
      </div>
    </>
  );
}

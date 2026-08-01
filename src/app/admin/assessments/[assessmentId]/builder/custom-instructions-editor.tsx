"use client";

import { useState } from "react";
import { GripVertical, X } from "lucide-react";
import type { CustomPoint } from "@/lib/custom-instructions";

const DEFAULT_INSTRUCTION_PRESETS = [
  "This session is proctored and recorded.",
  "Please use a laptop or desktop — mobile devices are not supported.",
  "Keep a valid photo ID ready for verification before you begin.",
  "Ensure a stable internet connection throughout the assessment.",
  "Do not use external resources, calculators, or assistance during the test.",
  "Find a quiet, well-lit space free from interruptions before starting.",
];

export function CustomInstructionsEditor({ initial }: { initial: CustomPoint[] }) {
  const [points, setPoints] = useState<CustomPoint[]>(initial);
  const [draft, setDraft] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function addPoint(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPoints((prev) => [...prev, { text: trimmed, enabled: true }]);
    setDraft("");
  }

  function removePoint(index: number) {
    setPoints((prev) => prev.filter((_, i) => i !== index));
  }

  function toggle(index: number) {
    setPoints((prev) => prev.map((p, i) => (i === index ? { ...p, enabled: !p.enabled } : p)));
  }

  function moveTo(from: number, to: number) {
    setPoints((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  const availablePresets = DEFAULT_INSTRUCTION_PRESETS.filter(
    (preset) => !points.some((p) => p.text === preset),
  );

  return (
    <div className="grid gap-3">
      <input type="hidden" name="customPointsConfig" value={JSON.stringify(points)} />

      {points.length > 0 && (
        <ol className="grid gap-2">
          {points.map((point, i) => (
            <li
              key={`${i}-${point.text}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== i) moveTo(dragIndex, i);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={`flex items-start gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm transition ${
                point.enabled ? "bg-[#F8FAFC]" : "bg-[#F1F5F9] opacity-60"
              }`}
            >
              <span
                className="mt-0.5 shrink-0 cursor-grab text-[#CBD5E1] active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical size={14} />
              </span>
              <input
                type="checkbox"
                checked={point.enabled}
                onChange={() => toggle(i)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
              <span className="flex-1 leading-relaxed text-[#334155]">{point.text}</span>
              <button
                type="button"
                onClick={() => removePoint(i)}
                aria-label={`Remove instruction ${i + 1}`}
                className="mt-0.5 shrink-0 text-[#94A3B8] transition hover:text-rose-600"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addPoint(draft);
            }
          }}
          placeholder="Type a new instruction point and press Enter…"
          className="tg-input flex-1"
        />
        <button
          type="button"
          onClick={() => addPoint(draft)}
          className="shrink-0 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-medium text-[#334155] transition hover:border-[#2563EB] hover:text-[#2563EB]"
        >
          Add point
        </button>
      </div>

      {availablePresets.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[#64748B]">Or add a common default:</p>
          <div className="flex flex-wrap gap-1.5">
            {availablePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => addPoint(preset)}
                className="rounded-full border border-[#CBD5E1] bg-white px-3 py-1 text-xs text-[#475569] transition hover:border-[#2563EB] hover:text-[#2563EB]"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

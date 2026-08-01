"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { DEFAULT_INSTRUCTIONS } from "@/lib/default-instructions";

interface DefaultItemState {
  key: string;
  enabled: boolean;
}

export function DefaultInstructionsEditor({
  initialOrder,
  initialDisabled,
}: {
  initialOrder: string[];
  initialDisabled: string[];
}) {
  const [items, setItems] = useState<DefaultItemState[]>(() =>
    initialOrder.map((key) => ({ key, enabled: !initialDisabled.includes(key) })),
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function toggle(key: string) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, enabled: !it.enabled } : it)));
  }

  function moveTo(from: number, to: number) {
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  const infoByKey = new Map(DEFAULT_INSTRUCTIONS.map((d) => [d.key, d]));

  return (
    <div className="grid gap-2">
      <input type="hidden" name="defaultsConfig" value={JSON.stringify(items)} />
      {items.map((item, i) => {
        const info = infoByKey.get(item.key);
        if (!info) return null;
        return (
          <div
            key={item.key}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== i) moveTo(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
              item.enabled ? "border-[#E2E8F0] bg-white" : "border-[#E2E8F0] bg-[#F8FAFC] opacity-60"
            }`}
          >
            <span
              className="mt-0.5 shrink-0 cursor-grab text-[#CBD5E1] active:cursor-grabbing"
              title="Drag to reorder"
            >
              <GripVertical size={16} />
            </span>
            <label className="flex flex-1 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={() => toggle(item.key)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
              <span>
                <span className="block font-medium text-[#0F172A]">{info.heading}</span>
                <span className="block text-xs text-[#64748B]">{info.text}</span>
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );
}

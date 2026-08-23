"use client";

import { useState } from "react";

const fileInputCls =
  "w-full text-xs text-[#475569] file:mr-2 file:rounded-md file:border-0 file:bg-[#EFF6FF] file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-[#2563EB] file:cursor-pointer";

/** Up to `max` image file inputs, named `${namePrefix}1`, `${namePrefix}2`, … — add/remove client-side, server action reads whichever are present via FormData. */
export function QuestionImagesField({ namePrefix = "img", max = 3 }: { namePrefix?: string; max?: number }) {
  const [count, setCount] = useState(1);
  const [previews, setPreviews] = useState<(string | null)[]>(Array(max).fill(null));

  function handleChange(idx: number, file: File | null) {
    setPreviews((prev) => {
      const next = [...prev];
      next[idx] = file ? URL.createObjectURL(file) : null;
      return next;
    });
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[#475569]">
        Images <span className="font-normal text-[#94A3B8]">(optional, up to {max})</span>
      </label>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="file"
              name={`${namePrefix}${idx + 1}`}
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => handleChange(idx, e.target.files?.[0] ?? null)}
              className={fileInputCls}
            />
            {previews[idx] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previews[idx]!} alt="" className="h-9 w-9 shrink-0 rounded border border-[#E2E8F0] object-cover" />
            )}
          </div>
        ))}
      </div>
      {count < max && (
        <button
          type="button"
          onClick={() => setCount((c) => Math.min(max, c + 1))}
          className="mt-1.5 text-xs font-medium text-[#0F766E] hover:underline"
        >
          + Add another image
        </button>
      )}
    </div>
  );
}

/** Single audio file input with an inline preview player once a file is chosen. */
export function QuestionAudioField({ name = "audio" }: { name?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[#475569]">
        Audio clip <span className="font-normal text-[#94A3B8]">(optional)</span>
      </label>
      <input
        type="file"
        name={name}
        accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mp4,audio/x-m4a"
        onChange={(e) => {
          const f = e.target.files?.[0];
          setPreview(f ? URL.createObjectURL(f) : null);
        }}
        className={fileInputCls}
      />
      {preview && <audio controls src={preview} className="mt-1.5 w-full" />}
    </div>
  );
}

/** Single image file input for one answer option (e.g. a graph as a choice) — no add/remove, just one slot. */
export function OptionImageField({ name }: { name: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        name={name}
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          setPreview(f ? URL.createObjectURL(f) : null);
        }}
        className={fileInputCls}
      />
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-8 w-8 shrink-0 rounded border border-[#E2E8F0] object-cover" />
      )}
    </div>
  );
}

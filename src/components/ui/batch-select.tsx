"use client";

import { useState } from "react";

export function BatchSelect({ existingBatches }: { existingBatches: string[] }) {
  const [selected, setSelected] = useState<string>("");
  const [customName, setCustomName] = useState("");

  const isOther = selected === "__other__";

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-xs font-medium text-[#475569]">
        Batch <span className="font-normal text-[#94A3B8]">(optional)</span>
      </label>

      <select
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          setCustomName("");
        }}
        className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-[#2563EB] focus:outline-none"
      >
        <option value="">— No batch —</option>
        {existingBatches.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
        <option value="__other__">Other (create new batch)</option>
      </select>

      {/* Hidden input carries the actual value for the form action */}
      <input
        type="hidden"
        name="batchName"
        value={isOther ? customName.trim() : selected}
      />

      {isOther && (
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Enter new batch name…"
          className="w-full rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
          autoFocus
        />
      )}
    </div>
  );
}

"use client";

import { useState, useMemo, useTransition } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";

type MappingRow = {
  id: string;
  weight: number;
  attribute: { code: string; name: string };
};

type CompetencyOption = {
  id: string;
  name: string;
  mappings: MappingRow[];
};

export function WeightEditorPanel({
  competencies,
  bulkUpdateWeights,
}: {
  competencies: CompetencyOption[];
  bulkUpdateWeights: (updates: { id: string; weight: number }[]) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const competency = useMemo(
    () => competencies.find((c) => c.id === selectedId) ?? null,
    [competencies, selectedId],
  );

  function handleSelect(id: string) {
    setSelectedId(id);
    setSaved(false);
    const comp = competencies.find((c) => c.id === id);
    if (comp) {
      const initial: Record<string, string> = {};
      for (const m of comp.mappings) initial[m.id] = String(m.weight);
      setWeights(initial);
    } else {
      setWeights({});
    }
  }

  function handleSave() {
    if (!competency) return;
    const updates = competency.mappings.map((m) => ({
      id: m.id,
      weight: parseFloat(weights[m.id] ?? "1") || 1,
    }));
    startTransition(async () => {
      await bulkUpdateWeights(updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  const hasChanges = competency?.mappings.some(
    (m) => String(m.weight) !== (weights[m.id] ?? String(m.weight))
  );

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4">
        <h2 className="text-sm font-semibold text-[#0F172A]">Edit Weights by Competency</h2>
        <p className="mt-0.5 text-xs text-[#64748B]">Select a competency to update all its attribute weights at once.</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Competency selector */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <ChevronDown size={14} className="text-[#94A3B8]" />
          </div>
          <select
            value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
            className="w-full appearance-none rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-[#1D4ED8] focus:outline-none pr-8"
          >
            <option value="">Select competency…</option>
            {competencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.mappings.length} attribute{c.mappings.length !== 1 ? "s" : ""})
              </option>
            ))}
          </select>
        </div>

        {/* Weight rows */}
        {competency && (
          <>
            {competency.mappings.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                No attributes mapped to this competency yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-[#E2E8F0]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-left text-xs font-semibold text-[#94A3B8]">
                      <th className="px-4 py-2.5">Code</th>
                      <th className="px-4 py-2.5">Attribute</th>
                      <th className="px-4 py-2.5 w-32">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8FAFC]">
                    {competency.mappings.map((m) => {
                      const changed = weights[m.id] !== undefined && weights[m.id] !== String(m.weight);
                      return (
                        <tr key={m.id} className={changed ? "bg-blue-50/50" : ""}>
                          <td className="px-4 py-2.5">
                            <span className="rounded bg-[#EFF6FF] px-2 py-0.5 font-mono text-xs font-bold text-[#1D4ED8]">
                              {m.attribute.code}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[#334155]">{m.attribute.name}</td>
                          <td className="px-4 py-2.5">
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={weights[m.id] ?? String(m.weight)}
                              onChange={(e) =>
                                setWeights((prev) => ({ ...prev, [m.id]: e.target.value }))
                              }
                              className={`w-24 rounded border px-2 py-1 text-sm focus:outline-none focus:border-[#1D4ED8] ${
                                changed ? "border-[#1D4ED8] bg-white" : "border-[#E2E8F0]"
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {competency.mappings.length > 0 && (
              <div className="flex items-center justify-between pt-1">
                {saved ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <CheckCircle2 size={13} /> All weights saved
                  </span>
                ) : (
                  <span className="text-xs text-[#94A3B8]">
                    {hasChanges ? "Unsaved changes" : "No changes"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={pending || !hasChanges}
                  className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-40 transition"
                >
                  {pending ? "Saving…" : `Update All Weights`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import type { ReportPayload } from "@/lib/report-data";

// TPI v1.0 formula: Converted = 1 + (raw − 5) × 9 / 12
// Raw range 5–17 → Converted range 1–10
function toTenPoint(raw: number): number {
  const converted = 1 + ((raw - 5) * 9) / 12;
  return Math.round(Math.min(10, Math.max(1, converted)) * 10) / 10;
}

const FACTOR_ORDER = [
  "Extraversion",
  "Agreeableness",
  "Conscientiousness",
  "Openness to experience",
  "Emotional stability",
];

export function AttributeScoresTable({ report }: { report: ReportPayload }) {
  const rows = [...report.traitScores].sort((a, b) => {
    const fi = FACTOR_ORDER.indexOf(a.factor) - FACTOR_ORDER.indexOf(b.factor);
    if (fi !== 0) return fi;
    return a.trait.localeCompare(b.trait);
  });

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">No trait scores available.</p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#2563EB] text-white">
            <th className="px-2 py-3 text-left font-semibold sm:px-4">Factor</th>
            <th className="px-2 py-3 text-left font-semibold sm:px-4">Attribute</th>
            <th className="px-2 py-3 text-center font-semibold sm:px-4">Raw Score<br /><span className="text-[11px] font-normal opacity-80">(5 – 17)</span></th>
            <th className="px-2 py-3 text-center font-semibold sm:px-4">Score<br /><span className="text-[11px] font-normal opacity-80">(out of 10)</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const converted = toTenPoint(r.score);
            const isEven = i % 2 === 0;
            return (
              <tr key={`${r.factor}-${r.trait}`} className={isEven ? "bg-white" : "bg-[#F8FAFC]"}>
                <td className="px-2 py-2.5 text-[#475569] text-xs sm:px-4">{r.factor}</td>
                <td className="px-2 py-2.5 font-medium text-[#0F172A] sm:px-4">{r.trait}</td>
                <td className="px-2 py-2.5 text-center tabular-nums text-[#334155] sm:px-4">{r.score}</td>
                <td className="px-2 py-2.5 text-center tabular-nums font-semibold text-[#2563EB] sm:px-4">{converted}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

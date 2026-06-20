import { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
}) {
  const iconThemeMap: Record<string, { bg: string; fg: string }> = {
    "Total Candidates": { bg: "#D1FAE5", fg: "#2563EB" },
    "Active Assessments": { bg: "#E0E7FF", fg: "#4338CA" },
    "Completed Tests": { bg: "#DCFCE7", fg: "#15803D" },
    "Average Score": { bg: "#FCE7F3", fg: "#BE185D" },
    "Pending Assignments": { bg: "#FEF3C7", fg: "#B45309" },
    "Recent Attempts": { bg: "#E0F2FE", fg: "#0369A1" },
    "Low Trust Attempts": { bg: "#FEE2E2", fg: "#B91C1C" },
  };
  const iconTheme = iconThemeMap[title] ?? { bg: "#D1FAE5", fg: "#2563EB" };

  return (
    <div className="tg-card flex min-h-[132px] flex-col justify-between p-6">
      <div className="flex items-start justify-between gap-2">
        <div
          className="shrink-0 rounded-xl p-2.5"
          style={{ backgroundColor: iconTheme.bg, color: iconTheme.fg }}
        >
          <Icon size={18} />
        </div>
        {hint ? <p className="max-w-[55%] text-right text-xs leading-snug text-[#64748B]">{hint}</p> : null}
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]/75">{title}</p>
        <p className="mt-2 text-[34px] font-semibold leading-none tracking-tight text-[#0F172A]">
          {value}
        </p>
      </div>
    </div>
  );
}

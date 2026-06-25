import { LucideIcon } from "lucide-react";

const themeMap: Record<string, {
  iconBg: string; iconFg: string;
  cardFrom: string; cardBorder: string; strip: string;
}> = {
  "Total Candidates":    { iconBg: "#DBEAFE", iconFg: "#2563EB", cardFrom: "#EFF6FF", cardBorder: "#BFDBFE", strip: "#2563EB" },
  "Active Assessments":  { iconBg: "#E0E7FF", iconFg: "#4338CA", cardFrom: "#EEF2FF", cardBorder: "#C7D2FE", strip: "#4338CA" },
  "Completed Tests":     { iconBg: "#CCFBF1", iconFg: "#0F766E", cardFrom: "#F0FDFA", cardBorder: "#99F6E4", strip: "#0F766E" },
  "Average Score":       { iconBg: "#DCFCE7", iconFg: "#16A34A", cardFrom: "#F0FDF4", cardBorder: "#BBF7D0", strip: "#16A34A" },
  "Pending Assignments": { iconBg: "#FEF3C7", iconFg: "#B45309", cardFrom: "#FFFBEB", cardBorder: "#FDE68A", strip: "#D97706" },
  "Recent Attempts":     { iconBg: "#E0F2FE", iconFg: "#0369A1", cardFrom: "#F0F9FF", cardBorder: "#BAE6FD", strip: "#0369A1" },
  "Low Trust Attempts":  { iconBg: "#FEE2E2", iconFg: "#B91C1C", cardFrom: "#FFF1F1", cardBorder: "#FECACA", strip: "#DC2626" },
  "Login Linked":        { iconBg: "#CCFBF1", iconFg: "#0F766E", cardFrom: "#F0FDFA", cardBorder: "#99F6E4", strip: "#0F766E" },
  "Default Password":    { iconBg: "#FEF3C7", iconFg: "#B45309", cardFrom: "#FFFBEB", cardBorder: "#FDE68A", strip: "#D97706" },
  "Likert Questions":    { iconBg: "#E0E7FF", iconFg: "#4338CA", cardFrom: "#EEF2FF", cardBorder: "#C7D2FE", strip: "#4338CA" },
  "Triad Groups":        { iconBg: "#CCFBF1", iconFg: "#0F766E", cardFrom: "#F0FDFA", cardBorder: "#99F6E4", strip: "#0F766E" },
  "Attributes":          { iconBg: "#DBEAFE", iconFg: "#2563EB", cardFrom: "#EFF6FF", cardBorder: "#BFDBFE", strip: "#2563EB" },
  "Competencies":        { iconBg: "#DCFCE7", iconFg: "#16A34A", cardFrom: "#F0FDF4", cardBorder: "#BBF7D0", strip: "#16A34A" },
};

const fallback = { iconBg: "#DBEAFE", iconFg: "#2563EB", cardFrom: "#EFF6FF", cardBorder: "#BFDBFE", strip: "#2563EB" };

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
  const t = themeMap[title] ?? fallback;

  return (
    <div
      className="relative flex min-h-[140px] flex-col justify-between overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: `linear-gradient(145deg, ${t.cardFrom} 0%, #ffffff 100%)`, borderColor: t.cardBorder }}
    >
      {/* colored top strip */}
      <div className="absolute left-0 top-0 h-[3px] w-full rounded-t-2xl" style={{ background: t.strip }} />

      <div className="flex items-start justify-between gap-2 pt-1">
        <div className="rounded-xl p-2.5 shadow-sm" style={{ backgroundColor: t.iconBg, color: t.iconFg }}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
        {hint && <p className="max-w-[55%] text-right text-xs leading-snug text-[#64748B]">{hint}</p>}
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: t.iconFg, opacity: 0.85 }}>
          {title}
        </p>
        <p className="mt-1.5 text-[32px] font-bold leading-none tracking-tight text-[#0F172A]">
          {value}
        </p>
      </div>
    </div>
  );
}

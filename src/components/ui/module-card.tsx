import Link from "next/link";
import { LucideIcon } from "lucide-react";

const ACCENT = [
  { border: "#BFDBFE", from: "#EFF6FF", to: "#DBEAFE", icon: "#2563EB", badge: "#EFF6FF", badgeText: "#1D4ED8", badgeHover: "#DBEAFE" },
  { border: "#99F6E4", from: "#F0FDFA", to: "#CCFBF1", icon: "#0F766E", badge: "#F0FDFA", badgeText: "#0F766E", badgeHover: "#CCFBF1" },
  { border: "#BBF7D0", from: "#F0FDF4", to: "#DCFCE7", icon: "#16A34A", badge: "#F0FDF4", badgeText: "#15803D", badgeHover: "#DCFCE7" },
  { border: "#BFDBFE", from: "#EFF6FF", to: "#DBEAFE", icon: "#2563EB", badge: "#EFF6FF", badgeText: "#1D4ED8", badgeHover: "#DBEAFE" },
  { border: "#99F6E4", from: "#F0FDFA", to: "#CCFBF1", icon: "#0F766E", badge: "#F0FDFA", badgeText: "#0F766E", badgeHover: "#CCFBF1" },
  { border: "#BBF7D0", from: "#F0FDF4", to: "#DCFCE7", icon: "#16A34A", badge: "#F0FDF4", badgeText: "#15803D", badgeHover: "#DCFCE7" },
];

export function ModuleCard({
  href,
  title,
  description,
  icon: Icon,
  colorIndex,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  colorIndex?: number;
}) {
  const a = ACCENT[(colorIndex ?? 0) % ACCENT.length];

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
      style={{ borderColor: a.border }}
    >
      {/* top accent strip */}
      <div
        className="h-1.5 w-full"
        style={{ background: `linear-gradient(to right, ${a.from}, ${a.border})` }}
      />

      <div className="p-5">
        {/* icon */}
        <div
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105"
          style={{
            borderColor: a.border,
            background: `linear-gradient(135deg, ${a.from}, ${a.to})`,
            color: a.icon,
          }}
        >
          <Icon size={20} strokeWidth={2} />
        </div>

        <h3 className="text-base font-semibold tracking-tight text-[#0F172A]">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">{description}</p>

        <span
          className="mt-4 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300"
          style={{ background: a.badge, color: a.badgeText }}
        >
          Open
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
        </span>
      </div>

      {/* ghost icon watermark */}
      <div
        className="pointer-events-none absolute bottom-3 right-3 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]"
        style={{ color: a.icon }}
      >
        <Icon size={72} strokeWidth={1.2} />
      </div>
    </Link>
  );
}

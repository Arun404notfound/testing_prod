import Link from "next/link";
import { LucideIcon } from "lucide-react";

export function ModuleCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group tg-card block p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-md"
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#BFDBFE] bg-gradient-to-b from-[#E6F7F1] to-[#D1FAE5] text-[#0F766E] shadow-sm transition-all duration-300 group-hover:scale-[1.04] group-hover:shadow-md">
          <Icon size={19} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-base font-semibold tracking-tight text-[#0F172A]">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">{description}</p>
          <span className="mt-4 inline-flex items-center gap-1 rounded-md bg-[#E6F7F1] px-2.5 py-1 text-sm font-semibold text-[#0F766E] transition-all duration-300 group-hover:bg-[#D1FAE5]">
            Open
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

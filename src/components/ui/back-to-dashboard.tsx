import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export function BackToDashboard({ href = "/admin/dashboard" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-xl border border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] px-4 py-2 text-sm font-semibold text-[#1D4ED8] shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-[#93C5FD] hover:shadow-md"
    >
      <LayoutDashboard size={15} className="transition-transform duration-200 group-hover:scale-110" />
      Back to Dashboard
    </Link>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Shield, User } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { UserRole } from "@/generated/prisma/enums";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
  CANDIDATE: "Candidate",
};

export function UserMenu({ email, role, initials }: { email: string; role: UserRole; initials: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 hover:bg-[#F4F6F9] transition"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#10B981] text-[9px] font-bold text-white shrink-0">
          {initials}
        </div>
        <span className="hidden sm:block text-[12px] font-medium text-[#374151] max-w-[140px] truncate">{email}</span>
        <ChevronDown size={12} className={`shrink-0 text-[#9CA3AF] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[#EAECF0] bg-white shadow-lg z-50 overflow-hidden">
          {/* Profile header */}
          <div className="flex items-center gap-3 border-b border-[#F3F4F6] px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#10B981] text-[11px] font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#111827]">{email}</p>
              <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-[#E6F7F1] px-2 py-0.5">
                <Shield size={9} className="text-[#0F766E]" />
                <span className="text-[10px] font-semibold text-[#0F766E]">{ROLE_LABEL[role] ?? role}</span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <div className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#6B7280]">
              <User size={14} className="text-[#9CA3AF]" />
              <span>Profile</span>
              <span className="ml-auto text-[10px] text-[#D1D5DB] font-medium">Coming soon</span>
            </div>
          </div>

          <div className="border-t border-[#F3F4F6] py-1">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

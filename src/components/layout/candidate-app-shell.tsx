"use client";

import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/actions/auth";

export function CandidateAppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = email
    .split("@")[0]
    .split(/[._-]/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  const isTestPage = pathname.includes("/test/");

  /* ── TEST PAGE: true full-screen, zero page scroll ─────────────────────── */
  if (isTestPage) {
    return (
      /* h-screen + overflow-hidden = browser viewport is the only scroll root */
      <div className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC] text-[#334155]">
        {/* Top bar — fixed height, shrinks nothing */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 sm:px-6">
          <div className="relative h-7 w-28">
            <Image
              src="/tg-logo.jpg"
              alt="TechGrah"
              fill
              className="object-contain object-left"
              sizes="112px"
              priority
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[220px] truncate text-xs text-[#64748B] sm:inline">
              {email}
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-xs font-bold text-white">
              {initials || email.slice(0, 2).toUpperCase()}
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm font-medium text-[#64748B] transition hover:text-rose-600"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* Content area: flex-1 + min-h-0 = fills remaining height exactly, no overflow */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  /* ── NORMAL PAGES: regular scrollable layout with sidebar ───────────────── */
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#334155]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 border-r border-[#E2E8F0] bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:block`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-[#F1F5F9] p-5">
            <div className="relative h-10 w-full">
              <Image
                src="/tg-logo.jpg"
                alt="TechGrah Innovations"
                fill
                className="object-contain object-left"
                sizes="200px"
                priority
              />
            </div>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">
              Assessment Portal
            </p>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            <Link
              href="/candidate"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                pathname === "/candidate"
                  ? "bg-[#EFF6FF] text-[#1D4ED8]"
                  : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              }`}
            >
              <LayoutDashboard size={16} />
              My Assessments
            </Link>
          </nav>

          <div className="border-t border-[#F1F5F9] p-4">
            <div className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-xs font-bold text-white">
                {initials || email.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#0F172A]">{email}</p>
                <p className="text-[10px] text-[#94A3B8]">Candidate</p>
              </div>
            </div>
            <form action={logoutAction} className="mt-2">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#475569] transition hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0 lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-[#E2E8F0] p-1.5 text-[#334155] lg:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle navigation"
              >
                {mobileOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
              <span className="text-sm font-semibold text-[#0F172A] lg:hidden">
                Candidate Portal
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden max-w-[220px] truncate text-xs text-[#64748B] sm:inline">
                {email}
              </span>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-xs font-bold text-white">
                {initials || email.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-5xl p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

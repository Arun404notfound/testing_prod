"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Brain,
  Building2,
  ChevronDown,
  ClipboardList,
  FileUp,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import type { UserRole } from "@/generated/prisma/enums";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/candidates", label: "Candidates", icon: Users },
      { href: "/admin/assignments", label: "Assignments", icon: UserPlus },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/assessments", label: "Assessments", icon: ClipboardList },
      { href: "/admin/questions", label: "Questions", icon: HelpCircle },
      { href: "/admin/competencies", label: "Competencies", icon: Brain },
      { href: "/admin/imports", label: "Imports", icon: FileUp },
    ],
  },
  {
    label: "Reports & Settings",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/tenants", label: "Tenants", icon: Building2 },
    ],
  },
];

export function AdminAppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { email: string; role: UserRole };
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const initials = user.email
    .split("@")[0]
    .split(/[._-]/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || user.email.slice(0, 2).toUpperCase();

  const activeLabel = navGroups.flatMap((g) => g.items).find((item) =>
    item.href === "/admin/dashboard"
      ? pathname === "/admin/dashboard"
      : pathname.startsWith(item.href)
  )?.label ?? "Admin";

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#1F2937]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 bg-white flex flex-col border-r border-[#EAECF0] shadow-sm transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:flex`}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 shrink-0">
          <div className="relative h-10 w-40">
            <Image
              src="/Logo 1.webp"
              alt="TechGrah Innovations"
              fill
              className="object-contain object-left"
              sizes="160px"
              priority
            />
          </div>
          <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
            Admin · Assessment Portal
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.href === "/admin/dashboard"
                      ? pathname === "/admin/dashboard"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                        active
                          ? "bg-[#E6F7F1] text-[#0F766E]"
                          : "text-[#6B7280] hover:bg-[#F4F6F9] hover:text-[#1F2937]"
                      }`}
                    >
                      <Icon
                        size={15}
                        className={active ? "text-[#0F766E]" : "text-[#9CA3AF]"}
                      />
                      {item.label}
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0F766E]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Decorative wave + user footer */}
        <div className="shrink-0 relative overflow-hidden">
          {/* Teal wave decoration */}
          <svg
            viewBox="0 0 240 80"
            className="w-full text-[#E6F7F1] pointer-events-none select-none"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0,60 C60,20 120,80 180,40 C210,20 230,50 240,45 L240,80 L0,80 Z"
              fill="currentColor"
            />
            <path
              d="M0,70 C50,40 100,75 160,55 C200,42 225,60 240,58 L240,80 L0,80 Z"
              fill="#D1FAE5"
              opacity="0.6"
            />
          </svg>

          {/* User card */}
          <div className="px-3 pb-4 -mt-2 relative z-10">
            <div className="rounded-xl border border-[#EAECF0] bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-t-xl hover:bg-[#F4F6F9] transition"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#10B981] text-[10px] font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[11px] font-semibold text-[#111827]">{user.email}</p>
                  <p className="text-[10px] text-[#9CA3AF] capitalize">{user.role.replace("_", " ").toLowerCase()}</p>
                </div>
                <ChevronDown size={12} className="shrink-0 text-[#9CA3AF]" />
              </button>
              {userMenuOpen && (
                <div className="border-t border-[#F3F4F6]">
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-[12px] font-medium text-[#6B7280] rounded-b-xl hover:bg-rose-50 hover:text-rose-600 transition"
                    >
                      <LogOut size={13} />
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-[#EAECF0] bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
            {/* Mobile menu toggle */}
            <button
              className="rounded-lg border border-[#E5E7EB] p-1.5 text-[#6B7280] lg:hidden shrink-0"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={15} /> : <Menu size={15} />}
            </button>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  placeholder="Search assessments, tags, or competencies..."
                  className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] py-2 pl-8 pr-3 text-[13px] text-[#374151] placeholder:text-[#9CA3AF] focus:border-[#0F766E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/10 transition"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] text-[#9CA3AF] font-mono border border-[#E5E7EB] rounded px-1 py-0.5">
                  ⌘K
                </span>
              </div>
            </div>

            {/* Right: bell + user */}
            <div className="flex items-center gap-2 shrink-0">
              <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F4F6F9] transition">
                <Bell size={15} />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              </button>
              <div className="hidden sm:flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#10B981] text-[9px] font-bold text-white">
                  {initials}
                </div>
                <span className="text-[12px] font-medium text-[#374151] max-w-[140px] truncate">{user.email}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

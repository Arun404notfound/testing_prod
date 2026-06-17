"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Brain,
  Building2,
  ClipboardList,
  FileUp,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
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
  const initials = user.email
    .split("@")[0]
    .split(/[._-]/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || user.email.slice(0, 2).toUpperCase();

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
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-[#E2E8F0] bg-white flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:flex`}
      >
        {/* Logo block */}
        <div className="border-b border-[#F1F5F9] px-5 py-5 shrink-0">
          <div className="relative h-11 w-full">
            <Image
              src="/TG Logo.png"
              alt="TechGrah Innovations"
              fill
              className="object-contain object-left"
              sizes="220px"
              priority
            />
          </div>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]">
            Admin · Assessment Portal
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-[#CBD5E1]">
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
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        active
                          ? "bg-[#EFF6FF] text-[#1D4ED8]"
                          : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <Icon size={16} className={active ? "text-[#1D4ED8]" : "text-[#94A3B8]"} />
                      {item.label}
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#1D4ED8]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-[#F1F5F9] p-4">
          <div className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#0F172A]">{user.email}</p>
              <p className="text-[10px] text-[#94A3B8]">{user.role.replace("_", " ")}</p>
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
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg border border-[#E2E8F0] p-1.5 text-[#334155] lg:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle navigation"
              >
                {mobileOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
              {/* Breadcrumb hint */}
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-[#0F172A]">
                  {navGroups.flatMap((g) => g.items).find((item) =>
                    item.href === "/admin/dashboard"
                      ? pathname === "/admin/dashboard"
                      : pathname.startsWith(item.href)
                  )?.label ?? "Admin"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-[#94A3B8] sm:inline">
                {user.email}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-xs font-bold text-white">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

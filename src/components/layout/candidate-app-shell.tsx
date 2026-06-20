"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertCircle, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
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
  const [showSignOutWarning, setShowSignOutWarning] = useState(false);
  const [submittingAndOut, setSubmittingAndOut] = useState(false);
  const [, startSignOutTransition] = useTransition();

  const handleSignOutFromTest = async () => {
    const attemptId = (() => { try { return sessionStorage.getItem("activeAttemptId"); } catch { return null; } })();
    if (attemptId) {
      setSubmittingAndOut(true);
      try {
        await fetch(`/api/candidate/attempts/${attemptId}/submit-progress`, {
          method: "POST",
          credentials: "same-origin",
        });
      } catch { /* best-effort */ } finally {
        setSubmittingAndOut(false);
      }
      try { sessionStorage.removeItem("activeAttemptId"); } catch { /* ignore */ }
    }
    setShowSignOutWarning(false);
    startSignOutTransition(() => { void logoutAction(); });
  };
  const initials = email
    .split("@")[0]
    .split(/[._-]/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  const isTestPage = pathname.includes("/test/");

  const SignOutWarningModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="px-6 pt-6 pb-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle size={22} className="text-amber-600" />
          </div>
          <h2 className="text-center text-base font-bold text-[#0F172A]">Assessment in Progress</h2>
          <p className="mt-2 text-center text-sm leading-relaxed text-[#475569]">
            You are currently in the middle of an assessment. Your answers are being auto-saved, but signing out will leave the test incomplete.
          </p>
          <p className="mt-2 text-center text-sm text-[#64748B]">
            Your answered questions will be <span className="font-semibold text-[#0F766E]">auto-submitted</span> if you sign out now.
          </p>
        </div>
        <div className="flex border-t border-[#F1F5F9]">
          <button
            type="button"
            disabled={submittingAndOut}
            onClick={() => setShowSignOutWarning(false)}
            className="flex-1 py-4 text-sm font-semibold text-[#0F766E] hover:bg-[#F8FAFC] transition disabled:opacity-50"
          >
            Stay &amp; Continue
          </button>
          <div className="w-px bg-[#F1F5F9]" />
          <button
            type="button"
            disabled={submittingAndOut}
            onClick={() => void handleSignOutFromTest()}
            className="flex flex-1 items-center justify-center gap-2 py-4 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
          >
            {submittingAndOut ? (
              <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />Submitting…</>
            ) : "Submit & Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );

  /* ── TEST PAGE: true full-screen, zero page scroll ─────────────────────── */
  if (isTestPage) {
    return (
      /* h-screen + overflow-hidden = browser viewport is the only scroll root */
      <div className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC] text-[#334155]">
        {showSignOutWarning && <SignOutWarningModal />}

        {/* Top bar — fixed height, shrinks nothing */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 sm:px-6">
          <div className="relative h-10 w-36">
            <Image
              src="/Logo 1.webp"
              alt="TechGrah"
              fill
              className="object-contain object-left"
              sizes="144px"
              priority
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[220px] truncate text-xs text-[#64748B] sm:inline">
              {email}
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#10B981] text-xs font-bold text-white">
              {initials || email.slice(0, 2).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={() => setShowSignOutWarning(true)}
              className="text-sm font-medium text-[#64748B] transition hover:text-rose-600"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Content area: flex-1 + min-h-0 = fills remaining height exactly; overflow-y-auto allows instructions page to scroll while test runner content fits exactly */}
        <div className="min-h-0 flex-1 overflow-y-auto">
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
        className={`fixed inset-y-0 left-0 z-30 w-60 border-r border-[#1E3A5F] bg-[#0B1D3A] transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:block`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-[#1E3A5F] px-5 py-4">
            <div className="relative h-10 w-36">
              <Image
                src="/Logo 1.webp"
                alt="TechGrah Innovations"
                fill
                className="object-contain object-left"
                sizes="144px"
                priority
              />
            </div>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">
              Assessment Portal
            </p>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            <Link
              href="/candidate"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                pathname === "/candidate"
                  ? "bg-[#1E3A5F] text-[#10B981]"
                  : "text-[#94A3B8] hover:bg-[#1E3A5F] hover:text-white"
              }`}
            >
              <LayoutDashboard size={16} />
              My Assessments
            </Link>
          </nav>

          <div className="border-t border-[#1E3A5F] p-4">
            <div className="flex items-center gap-3 rounded-xl bg-[#1E3A5F] px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#10B981] text-xs font-bold text-white">
                {initials || email.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{email}</p>
                <p className="text-[10px] text-[#64748B]">Candidate</p>
              </div>
            </div>
            <form action={logoutAction} className="mt-2">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#94A3B8] transition hover:bg-rose-900/30 hover:text-rose-400"
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#10B981] text-xs font-bold text-white">
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

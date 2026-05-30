"use client";

import { useState, useRef } from "react";
import { ChevronDown, Shield, User } from "lucide-react";
import { loginAction } from "@/app/actions/auth";

const QUICK_LOGINS = [
  {
    label: "Admin",
    email: "admin@demo.local",
    password: "demo1234",
    icon: Shield,
    color: "text-[#1D4ED8]",
    bg: "hover:bg-[#EFF6FF]",
  },
  {
    label: "Candidate",
    email: "alex.chen@example.com",
    password: "demo1234",
    icon: User,
    color: "text-emerald-600",
    bg: "hover:bg-emerald-50",
  },
] as const;

export function LoginForm({
  next,
  error,
}: {
  next?: string;
  error?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function fillAndSubmit(preset: (typeof QUICK_LOGINS)[number]) {
    setEmail(preset.email);
    setPassword(preset.password);
    setOpen(false);
    // defer submit one tick so state has flushed into inputs
    setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  return (
    <form ref={formRef} action={loginAction} className="space-y-5">
      {next && next.startsWith("/") && !next.startsWith("//") ? (
        <input type="hidden" name="next" value={next} />
      ) : null}

      {/* Error banners */}
      {error === "invalid" && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <span className="mt-0.5 text-rose-500">⚠</span>
          <p className="text-sm text-rose-800">Invalid email or password. Please try again.</p>
        </div>
      )}
      {error === "missing" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="mt-0.5 text-amber-500">⚠</span>
          <p className="text-sm text-amber-900">Please enter both email and password.</p>
        </div>
      )}

      {/* Quick-login dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm font-medium text-[#475569] transition hover:border-[#93C5FD] hover:bg-white"
        >
          <span className="text-[#64748B]">Quick login as…</span>
          <ChevronDown
            size={15}
            className={`text-[#94A3B8] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            {/* Dropdown panel */}
            <div className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
              {QUICK_LOGINS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => fillAndSubmit(preset)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${preset.bg}`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] ${preset.color}`}>
                      <Icon size={14} />
                    </span>
                    <div>
                      <p className="font-semibold text-[#0F172A]">{preset.label}</p>
                      <p className="text-[11px] text-[#94A3B8]">{preset.email}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-[#E2E8F0]" />
        <span className="text-[11px] font-medium text-[#94A3B8]">or enter manually</span>
        <div className="flex-1 border-t border-[#E2E8F0]" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#334155]">Email address</label>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="tg-input w-full"
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#334155]">Password</label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="tg-input w-full"
          placeholder="••••••••"
        />
      </div>

      <button type="submit" className="tg-button-primary w-full py-3 text-base font-semibold mt-2">
        Sign in
      </button>
    </form>
  );
}

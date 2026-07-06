"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export function LoginForm({
  next,
  error,
}: {
  next?: string;
  error?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={loginAction} className="space-y-5">
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

      {/* Email */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[#334155]">Email address</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/10 transition"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[#334155]">Password</label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            className="w-full rounded-lg border border-[#CBD5E1] bg-white py-2 pl-9 pr-9 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/10 transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <div className="-mt-2 text-right"><Link href="/forgot-password" className="text-xs font-semibold text-[#0F766E] hover:underline">Forgot password?</Link></div>
      <button type="submit" className="w-full py-2.5 text-sm font-semibold mt-1 rounded-lg bg-[#0F766E] hover:bg-[#0D9488] text-white transition">
        Sign in
      </button>
    </form>
  );
}

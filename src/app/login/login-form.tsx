"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm({
  next,
  error,
}: {
  next?: string;
  error?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

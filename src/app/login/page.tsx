import Image from "next/image";
import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth/require-user";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const existing = await getOptionalSession();
  if (existing) {
    if (existing.role === "CANDIDATE") redirect("/candidate");
    redirect("/admin/dashboard");
  }

  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-center bg-gradient-to-br from-[#0B1D3A] via-[#2563EB] to-[#1D4EDB] px-14 py-14 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute top-1/2 right-0 h-56 w-56 rounded-full bg-emerald-400/10 blur-2xl" />

        {/* Main copy — badge sits right above heading */}
        <div className="relative space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[13px] font-semibold text-white/90 tracking-wide">Psychometric Assessment Portal</span>
          </div>

          <h1 className="text-[2.75rem] font-extrabold text-white leading-[1.15] tracking-tight">
            Unlock talent insights with precision assessments
          </h1>
          <p className="text-[1.0625rem] text-white/75 leading-[1.75] font-light">
            Evidence-based Big Five personality profiling. Competency mapping. Detailed candidate reports — all in one platform.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: "Accuracy", value: "Big Five" },
              { label: "Questions", value: "50" },
              { label: "Report", value: "Auto" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="mt-1 text-[11px] font-semibold text-white/55 uppercase tracking-[0.12em]">{stat.label}</p>
              </div>
            ))}
          </div>

          <p className="pt-4 text-[12px] font-medium text-white/40 tracking-wide">
            © 2026 TechGrah Innovations Pvt. Ltd. · Powered by AI-backed psychometrics
          </p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-[#F8FAFC] lg:bg-white">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="relative h-20 w-64">
              <Image src="/logo_login.webp" alt="TechGrah Innovations" fill className="object-contain" sizes="256px" priority />
            </div>
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-[#0F172A]">Welcome back</h2>
            <p className="mt-2 text-sm text-[#64748B]">Sign in to your workspace account</p>
          </div>

          <LoginForm next={next} error={error} />

          <p className="mt-8 text-center text-xs text-[#94A3B8]">
            Having trouble? Contact your assessment administrator.
          </p>
        </div>
      </div>

    </div>
  );
}

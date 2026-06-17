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
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-center bg-gradient-to-br from-[#1D4ED8] via-[#1E40AF] to-[#1e3a8a] p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-12 -left-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-1/2 right-8 h-48 w-48 rounded-full bg-white/5" />

        <div className="relative space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-white/90 tracking-wide">Psychometric Assessment Portal</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Unlock talent insights with precision assessments
          </h1>
          <p className="text-base text-blue-100 leading-relaxed">
            Evidence-based Big Five personality profiling. Competency mapping. Detailed candidate reports — all in one platform.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: "Accuracy", value: "Big Five" },
              { label: "Questions", value: "50" },
              { label: "Report", value: "Auto" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur-sm">
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="mt-0.5 text-[11px] text-blue-200 uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-blue-300/70">
          © 2026 TechGrah Innovations Pvt. Ltd. · Powered by AI-backed psychometrics
        </p>
      </div>

      {/* Right login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-[#F8FAFC] lg:bg-white">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="relative h-20 w-64">
              <Image src="/TG Logo.png" alt="TechGrah Innovations" fill className="object-contain" sizes="256px" priority />
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

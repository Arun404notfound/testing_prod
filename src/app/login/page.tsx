import Image from "next/image";
import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth/require-user";
import { LoginForm } from "./login-form";
import { AnimatedTagline } from "./tagline";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const existing = await getOptionalSession();
  if (existing) redirect("/admin/dashboard");

  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[48%] flex-col justify-center bg-gradient-to-br from-[#0B1D3A] via-[#0F766E] to-[#10B981] px-14 py-14 relative overflow-hidden">
        {/* Decorative wave on right edge */}
        <svg className="pointer-events-none absolute right-0 inset-y-0 h-full" viewBox="0 0 80 800" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M80,0 C40,200 60,400 20,600 C0,700 40,750 80,800 L80,0Z" fill="white" fillOpacity="0.04" />
          <path d="M80,100 C50,300 70,500 30,700 L80,800 L80,100Z" fill="white" fillOpacity="0.03" />
        </svg>

        {/* Middle: main copy */}
        <div className="relative space-y-5 max-w-lg">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[13px] font-semibold text-white/90 tracking-wide">Psychometric Assessment Portal</span>
          </div>

          <div>
            <h1 className="text-[2.75rem] font-extrabold text-white leading-[1.15] tracking-tight">
              Unlock talent insights with precision assessments
            </h1>
            {/* Green accent underline */}
            <div className="mt-4 h-[3px] w-16 rounded-full bg-emerald-400" />
          </div>

          <p className="text-[1.0625rem] text-white/75 leading-[1.75] font-light">
            Evidence-based Big Five personality profiling. Competency mapping. Detailed candidate reports — all in one platform.
          </p>
        </div>

        {/* Bottom: tagline + footer */}
        <div className="absolute bottom-10 left-14">
          <AnimatedTagline />
          <div className="mt-3">
            <p className="text-[12px] text-white/40">© 2026 TechGrah Innovations Pvt. Ltd.</p>
            <p className="text-[12px] text-white/40 flex items-center gap-1 mt-0.5">
              Powered by AI-backed psychometrics
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-emerald-400 opacity-60">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </p>
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-4 flex justify-center">
            <div className="relative h-20 w-64">
              <Image src="/Logo 1.webp" alt="TechGrah Innovations" fill className="object-contain" sizes="256px" priority />
            </div>
          </div>

          <div className="mb-6 text-center">
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

"use client";

import Image from "next/image";

/**
 * Candidates reach this shell via a one-time emailed link (no login), so there's no
 * identity, sidebar nav, or sign-out here — just the logo bar wrapping the test/report page.
 */
export function CandidateAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC] text-[#0F172A]">
      <header className="flex h-14 shrink-0 items-center border-b border-[#EAECF0] bg-white px-4 sm:px-6">
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
      </header>

      <div className="min-h-0 flex-1 overflow-auto flex flex-col">
        {children}
      </div>
    </div>
  );
}

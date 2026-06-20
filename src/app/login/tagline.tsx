"use client";

import DecryptedText from "@/components/ui/DecryptedText";

export function AnimatedTagline() {
  return (
    <p className="text-[2rem] font-extrabold tracking-tight">
      <DecryptedText
        text="Assess"
        animateOn="view"
        sequential
        revealDirection="start"
        speed={60}
        className="text-white"
        encryptedClassName="text-emerald-400/60"
      />
      <span className="text-emerald-400">.</span>
      <span> </span>
      <DecryptedText
        text="Analyze"
        animateOn="view"
        sequential
        revealDirection="start"
        speed={60}
        className="text-white"
        encryptedClassName="text-emerald-400/60"
      />
      <span className="text-emerald-400">.</span>
      <span> </span>
      <DecryptedText
        text="Advance"
        animateOn="view"
        sequential
        revealDirection="start"
        speed={60}
        className="text-white"
        encryptedClassName="text-emerald-400/60"
      />
      <span className="text-white/40">.</span>
    </p>
  );
}

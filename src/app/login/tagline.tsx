"use client";

import RotatingText from "@/components/ui/RotatingText";

export function AnimatedTagline() {
  return (
    <div className="flex items-center gap-2 text-[2rem] font-extrabold tracking-tight">
      <RotatingText
        texts={["Assess", "Analyze", "Advance"]}
        mainClassName="overflow-hidden text-white"
        splitLevelClassName="overflow-hidden"
        staggerFrom="last"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "-120%" }}
        staggerDuration={0.03}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        rotationInterval={2000}
      />
    </div>
  );
}

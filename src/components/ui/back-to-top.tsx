"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";

const SHOW_AFTER_PX = 300;

export function BackToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  // The candidate test page has a fixed webcam preview pinned to the same
  // bottom-right corner — sit above it there instead of overlapping.
  const isCandidateTest = pathname?.startsWith("/candidate/test/");

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className={`fixed right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
        isCandidateTest ? "bottom-40" : "bottom-6"
      }`}
      style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}
    >
      <ArrowUp size={20} />
    </button>
  );
}

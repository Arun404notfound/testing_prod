"use client";

import { useEffect } from "react";

/** Smooth-scrolls to the element with `targetId` on mount, if provided. */
export function ScrollToId({ targetId }: { targetId?: string | null }) {
  useEffect(() => {
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for this render's targetId
  }, []);

  return null;
}

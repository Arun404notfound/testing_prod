"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Guarantees its children fit within the remaining space on the current
 * `.report-page` (the space between this wrapper and the page's footer),
 * regardless of how long the underlying content (admin-authored bullet
 * points, band-interpretation text, etc.) turns out to be.
 *
 * Margins/paddings alone can never fully guarantee this — a competency with
 * enough long behavioural-implication bullets can always outgrow whatever
 * fixed budget the layout assumes. Instead, this measures the content's
 * natural height after fonts have loaded and, if it would overflow, applies
 * a uniform `transform: scale()` down to the space actually available. The
 * outer wrapper's height is set to the *post-scale* size so the page's own
 * flow layout (and Chrome's print pagination) sees the smaller size too —
 * transform alone doesn't affect layout, only paint.
 *
 * `data-fit` starts "pending" and flips to "done" once measurement/scaling
 * has settled — the PDF export route waits for this before snapshotting.
 */
export function AutoFitPageBody({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ outerHeight: number; scale: number } | null>(null);
  const [fitDone, setFitDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function measureAndFit() {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // fonts.ready rejecting is not fatal — fall through and measure anyway
        }
      }
      if (cancelled) return;

      const inner = innerRef.current;
      if (!inner) {
        setFitDone(true);
        return;
      }

      const naturalHeight = inner.scrollHeight;
      const page = inner.closest(".report-page");
      const footer = page?.querySelector(".report-page-footer");
      const bottomLimit = footer
        ? footer.getBoundingClientRect().top
        : (page?.getBoundingClientRect().bottom ?? Infinity);
      const contentTop = inner.getBoundingClientRect().top;
      const available = bottomLimit - contentTop;

      if (available > 0 && naturalHeight > available) {
        // Floor the shrink at 80% — beyond that, illegibly small text is worse
        // than a rare, small overflow, so we cap rather than keep shrinking.
        const scale = Math.max(0.8, available / naturalHeight);
        setFit({ outerHeight: Math.ceil(naturalHeight * scale), scale });
      }
      setFitDone(true);
    }

    measureAndFit();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={fit ? { height: fit.outerHeight, overflow: "visible" } : undefined} data-fit={fitDone ? "done" : "pending"}>
      <div
        ref={innerRef}
        style={
          fit
            ? { transform: `scale(${fit.scale})`, transformOrigin: "top left", width: `${100 / fit.scale}%` }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}

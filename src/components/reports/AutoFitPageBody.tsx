"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Floor the shrink here — beyond this, illegibly small text is worse than a rare, small overflow, so we cap rather than keep shrinking. */
const MIN_SCALE = 0.72;

/**
 * Target this fraction of the truly available space, not 100% of it. A
 * competency whose content lands within a few px of the edge is exactly the
 * case that turns into a hard bleed: the "On-the-Job Development Projects"
 * row is a flex row, and Chrome's print engine doesn't split an overflowing
 * flex row across pages the way it splits ordinary text — it defers the
 * *entire* row to a fresh page, leaving the space it would have used blank
 * on the page before it. A measurement that's correct to the pixel still
 * loses to that if it's exactly at the edge; targeting 88% leaves real slack
 * for last-mile rendering variance (font metrics, subpixel rounding) so a
 * near-miss shrinks a little instead of deferring a whole section — measured
 * against the actual server-rendered PDF, not just this tab, 94% still left
 * a competency's footer alone on its own near-blank trailing page.
 */
const SAFETY_MARGIN = 0.88;

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

    function measure(inner: HTMLDivElement) {
      const naturalHeight = inner.scrollHeight;
      const page = inner.closest(".report-page");
      const footer = page?.querySelector(".report-page-footer");
      const bottomLimit = footer ? footer.getBoundingClientRect().top : (page?.getBoundingClientRect().bottom ?? Infinity);
      const contentTop = inner.getBoundingClientRect().top;
      const available = bottomLimit - contentTop;
      return { naturalHeight, available };
    }

    // Plain setTimeout, deliberately not requestAnimationFrame — rAF callbacks
    // are suspended in a backgrounded/non-visible tab (and the server-side PDF
    // export's headless page is not guaranteed to count as "visible" either),
    // so an rAF-gated wait can simply never fire and hang measurement forever.
    // A real timer always fires. This also covers the actual reason for the
    // wait: a cold browser with nothing cached (the server-side PDF export
    // launches a fresh headless Chromium per request) can still be mid
    // font-swap reflow well after fonts.ready resolves, and only wall-clock
    // time reliably covers that network fetch.
    function settle(ms = 220): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function measureAndFit() {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // fonts.ready rejecting is not fatal — fall through and measure anyway
        }
      }
      if (cancelled) return;

      // A fresh, uncached browser — notably the headless Chromium the
      // server-side PDF export launches per request, with no font cache —
      // can still be mid font-swap reflow one tick after fonts.ready
      // resolves. Settling here keeps the measurement in sync with what's
      // actually painted instead of a stale fallback-font layout.
      await settle();
      if (cancelled) return;

      const inner = innerRef.current;
      if (!inner) {
        setFitDone(true);
        return;
      }

      let { naturalHeight, available } = measure(inner);
      let budget = available * SAFETY_MARGIN;

      // If this first pass found no overflow (against the safety-margined
      // budget, not the raw edge), re-verify after settling once more
      // before trusting it. Without this, a page that only overflows
      // *after* the real font finishes loading slips through as "fits"
      // here — and then bleeds onto an unheadered, unfootered extra page in
      // the actual export, even though it measured fine on this pass (this
      // is exactly how the report-page-body's own render can look correct
      // interactively while still overflowing once printed).
      if (!(budget > 0 && naturalHeight > budget)) {
        await settle();
        if (cancelled) return;
        ({ naturalHeight, available } = measure(inner));
        budget = available * SAFETY_MARGIN;
      }

      if (budget > 0 && naturalHeight > budget) {
        const scale = Math.max(MIN_SCALE, budget / naturalHeight);
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

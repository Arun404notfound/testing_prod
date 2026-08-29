/**
 * Print-only CSS shared by every print route (single-module and Program) that
 * headless Chrome converts straight to PDF — kept in one place so the two
 * routes can never drift on pagination behavior. See the per-rule comments
 * for why each one exists; they were all discovered the hard way against
 * Chrome's print engine.
 */
export function ReportPrintStyles() {
  return (
    <style>{`
      @page { size: A4; margin: 0; }
      html, body {
        margin: 0;
        background: #ffffff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      /*
       * ReportPageShell is flex flex-col with minHeight: 297mm so a short page still
       * fills a visual sheet on screen, and its body is itself flex-1 flex-col so it
       * can grow to push the footer to the bottom. The flex-grow part doesn't survive
       * contact with Chrome's print engine once a competency's content is tall enough
       * to fragment across two physical pages — nested flex-grow containers being
       * fragmented produced real corruption (footer text overlapping card content
       * instead of following it). Forcing plain block layout removes that ambiguity:
       * header/body are just two ordinary blocks stacked in flow, however many
       * physical pages that ends up spanning.
       */
      .report-page,
      .report-page-body {
        display: block !important;
      }
      .report-page {
        position: relative;
        break-after: page;
      }
      .report-page:last-child {
        break-after: auto;
      }
      /*
       * Reserve room so the body's own content never runs under the footer below.
       * Scoped to :has(.report-page-footer) — the cover page renders no footer at
       * all, and reserving space it doesn't need pushed its content past 297mm,
       * spilling one line onto an otherwise-empty second page.
       */
      .report-page:has(.report-page-footer) {
        padding-bottom: 26mm;
      }
      /*
       * The footer itself is pinned with position: absolute rather than flex's
       * margin-top: auto trick, precisely because absolute positioning is a plain,
       * unambiguous box placement Chrome's fragmentation engine resolves correctly —
       * unlike flex-grow, it never needs to renegotiate sizing across a page break.
       * For a short page (the common case) this places it flush with the true 297mm
       * bottom edge, matching the on-screen preview. For a competency whose content
       * genuinely overflows onto a second physical page, the footer lands at the
       * bottom of that (now taller) box rather than a specific physical page's edge —
       * an acceptable trade absent Chrome's (unsupported) CSS Paged Media counters.
       */
      .report-page-footer {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
      }
      [data-pdf-break-inside="avoid"] {
        break-inside: avoid;
      }
      [data-pdf-break-after="avoid"] {
        break-after: avoid;
      }
    `}</style>
  );
}

import { REPORT_DESIGN_COLORS } from "./report-theme";
import { reportTypography } from "./report-typography";

const C = REPORT_DESIGN_COLORS;

/**
 * Shared page-top heading — small uppercase eyebrow + a thin rule, then the
 * big bold title. Replaces ReportPageShell's old running-header chrome bar:
 * in the reference design each page's own content starts right at the top
 * margin, with this heading standing in for any logo/page-label bar. Fixed
 * colors (REPORT_DESIGN_COLORS), matching the reference exactly regardless
 * of tenant branding — same reasoning as CoverPage.
 */
export function SectionHeading({
  eyebrow,
  title,
  className,
}: {
  eyebrow: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <span style={{ ...reportTypography.h4, color: C.eyebrow, whiteSpace: "nowrap" }}>{eyebrow}</span>
        <span style={{ flex: 1, height: 1, backgroundColor: C.hairline }} />
      </div>
      <h2 style={{ ...reportTypography.display, color: C.ink, marginTop: "0.5rem" }}>{title}</h2>
    </div>
  );
}

/** Small crosshair tick at one corner of a bordered box — a technical/
 *  measurement motif from the reference design, used on the score box
 *  (CompetencyReportPage) and the closing note callout (ReportInterpretationPage).
 *  Render all four corners of a box by placing one per corner. */
export function CornerTick({ top, left }: { top: boolean; left: boolean }) {
  const edge = 6;
  return (
    <span
      style={{
        position: "absolute",
        [top ? "top" : "bottom"]: -1,
        [left ? "left" : "right"]: -1,
        width: edge,
        height: edge,
        transform: `translate(${left ? "-50%" : "50%"}, ${top ? "-50%" : "50%"})`,
        pointerEvents: "none",
      }}
    >
      <span style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, backgroundColor: "#94A3B8" }} />
      <span style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, backgroundColor: "#94A3B8" }} />
    </span>
  );
}

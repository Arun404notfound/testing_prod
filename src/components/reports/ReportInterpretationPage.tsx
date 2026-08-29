import { REPORT_DESIGN_COLORS } from "./report-theme";
import { reportTypography } from "./report-typography";
import { SectionHeading, CornerTick } from "./SectionHeading";

const C = REPORT_DESIGN_COLORS;

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <p style={{ ...reportTypography.h4, marginBottom: 6, color: C.eyebrow, letterSpacing: "0.06em" }}>{title.toUpperCase()}</p>
      {children}
    </div>
  );
}

/**
 * A dedicated "how to read this report" page — sits right after the
 * Executive Summary section and before the per-competency deep dive, so a
 * reader has the vocabulary (scale, bands, chart, strengths/focus split)
 * before hitting pages that use it without re-explaining every time.
 *
 * Kept deliberately compact (bodySmall throughout, short sentences) rather
 * than relying on autoFit's shrink-to-fit to make a long page work — a
 * one-page guide that's genuinely one page is more robust than one that
 * only fits after being scaled down, and less prone to the fresh-Puppeteer
 * measurement variance that makes borderline pages risky.
 */
export function ReportInterpretationPage() {
  return (
    <div>
      <SectionHeading eyebrow="Section 03" title="How to read this report" />
      <p style={{ ...reportTypography.body, color: C.body, marginTop: "0.75rem", marginBottom: "1.5rem" }}>
        A short guide to the scale, the chart and the terms used on the pages that follow.
      </p>

      <div className="grid grid-cols-2 gap-x-10">
        <GuideSection title="The 1–10 Scale">
          <p style={{ ...reportTypography.bodySmall, color: C.body }}>
            Every competency is scored from the candidate&rsquo;s responses against that competency&rsquo;s defined
            attributes. It marks a position on a continuum, not a pass or a fail.
          </p>
        </GuideSection>

        <GuideSection title="Proficiency Bands">
          <p style={{ ...reportTypography.bodySmall, color: C.body }}>
            Each score carries a band label such as Proficient or Intermediate. Band names vary by framework but
            always run from strongest demonstrated capability to greatest development need.
          </p>
        </GuideSection>

        <GuideSection title="The Radar Chart">
          <p style={{ ...reportTypography.bodySmall, color: C.body }}>
            Scores are plotted against the cohort median — the middle score among other candidates who completed the
            same assessment. Where the cohort is too small, the chart shows the candidate&rsquo;s scores alone.
          </p>
        </GuideSection>

        <GuideSection title="Strengths and Focus Areas">
          <p style={{ ...reportTypography.bodySmall, color: C.body }}>
            Key strengths are the highest-scoring competencies, above the proficient threshold and reliable today.
            Priority focus areas sit at or below it, where development has the most impact.
          </p>
        </GuideSection>
      </div>

      <div style={{ borderTop: `1px solid ${C.hairline}`, marginTop: "0.5rem", paddingTop: "1.25rem" }}>
        <p style={{ ...reportTypography.h3, color: C.ink, marginBottom: 4 }}>Reading a competency page</p>
        <p style={{ ...reportTypography.bodySmall, color: C.body, marginBottom: 14 }}>Every competency has its own page, and each is built the same way.</p>
        {[
          ["Description & Interpretation", "What the competency measures, and what this score means in practice."],
          ["Behavioural Implications", "What tends to show up day to day at this score level."],
          ["Watch-outs", "Risks and blind spots worth being aware of."],
          ["Development Projects", "Concrete, on-the-job actions for the areas that would benefit most."],
        ].map(([label, desc]) => (
          <div key={label} className="flex items-start" style={{ gap: "1.25rem", padding: "0.5rem 0" }}>
            <span style={{ ...reportTypography.h4, color: C.eyebrow, letterSpacing: "0.04em", width: "13rem", flexShrink: 0 }}>{label.toUpperCase()}</span>
            <span style={{ alignSelf: "stretch", width: 1, backgroundColor: C.hairline, flexShrink: 0 }} />
            <span style={{ ...reportTypography.bodySmall, color: C.body }}>{desc}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          position: "relative",
          backgroundColor: "#F8FAFC",
          border: "1px solid #CBD5E1",
          padding: "0.875rem 1.125rem",
          marginTop: "1.5rem",
        }}
      >
        <CornerTick top left />
        <CornerTick top left={false} />
        <CornerTick top={false} left />
        <CornerTick top={false} left={false} />
        <p style={{ ...reportTypography.bodySmall, color: C.body }}>
          This report is a structured signal to support conversations, interviews and development planning. It works
          best alongside professional judgement and business context, not in place of them.
        </p>
      </div>
    </div>
  );
}

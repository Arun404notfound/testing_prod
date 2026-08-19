"use client";

import { useReportTheme } from "./report-theme-context";
import { reportTypography } from "./report-typography";

const ACCENT_BG = "#F0FDFA";
const ACCENT_BORDER = "#99F6E4";
const FOCUS_BG = "#FFFBEB";
const FOCUS_BORDER = "#FDE68A";

function GuideSection({
  title,
  children,
  ink,
}: {
  title: string;
  children: React.ReactNode;
  ink: string;
}) {
  return (
    <div style={{ marginBottom: "0.875rem" }}>
      <h3 style={{ ...reportTypography.h3, marginBottom: 4, color: ink }}>{title}</h3>
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
  const { theme } = useReportTheme();

  return (
    <div>
      <div style={{ ...reportTypography.h2, borderBottom: `2px solid ${theme.ink}`, paddingBottom: "0.5rem", marginBottom: "0.5rem", color: theme.ink }}>
        How to Read This Report
      </div>
      <p style={{ ...reportTypography.bodyXSmall, color: theme.body, marginBottom: "1.125rem" }}>
        A short guide to the scale, chart and terms used throughout the pages that follow.
      </p>

      <GuideSection title="The 1–10 Scale" ink={theme.ink}>
        <p style={{ ...reportTypography.bodySmall, color: theme.body }}>
          Every competency is scored 1–10 from the candidate&rsquo;s responses against that competency&rsquo;s defined
          attributes. It is a position on a continuum, not a pass/fail result.
        </p>
      </GuideSection>

      <GuideSection title="Proficiency Bands" ink={theme.ink}>
        <p style={{ ...reportTypography.bodySmall, color: theme.body }}>
          Each score also carries a band label (e.g. <em>Proficient</em>, <em>Intermediate</em>). Band names vary by
          framework, but always move from strongest demonstrated capability to the greatest development need — the
          segmented bar under each score is a visual read of the same thing.
        </p>
      </GuideSection>

      <GuideSection title="The Radar Chart" ink={theme.ink}>
        <p style={{ ...reportTypography.bodySmall, color: theme.body }}>
          Scores are plotted against the <strong style={{ color: theme.ink }}>cohort median</strong>{" "}
          — the middle score among other candidates who completed this same assessment — for an at-a-glance read of
          performance relative to peers. With too small a cohort, the chart shows the candidate&rsquo;s own scores alone.
        </p>
      </GuideSection>

      <div style={{ display: "flex", alignItems: "stretch", gap: 16, flexWrap: "wrap", marginBottom: "0.875rem" }}>
        <div
          style={{
            flex: 1,
            minWidth: 220,
            backgroundColor: ACCENT_BG,
            border: `1px solid ${ACCENT_BORDER}`,
            borderRadius: 8,
            padding: "0.625rem 0.875rem",
          }}
        >
          <p style={{ ...reportTypography.h4, color: "#047857", marginBottom: 4 }}>Key Strengths</p>
          <p style={{ ...reportTypography.bodySmall, color: theme.body }}>
            Highest-scoring competencies (above the proficient threshold) — reliable today.
          </p>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 220,
            backgroundColor: FOCUS_BG,
            border: `1px solid ${FOCUS_BORDER}`,
            borderRadius: 8,
            padding: "0.625rem 0.875rem",
          }}
        >
          <p style={{ ...reportTypography.h4, color: "#B45309", marginBottom: 4 }}>Priority Focus Areas</p>
          <p style={{ ...reportTypography.bodySmall, color: theme.body }}>
            Lowest-scoring competencies (at or below the threshold) — where development has the most impact.
          </p>
        </div>
      </div>

      <GuideSection title="Reading a Competency Page" ink={theme.ink}>
        <p style={{ ...reportTypography.bodySmall, color: theme.body, marginBottom: 4 }}>
          Every competency gets its own page later in this report, each built the same way:
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {[
            ["Description & Score Interpretation", "what the competency measures and what this score means in practice."],
            ["Behavioural Implications", "what tends to show up day-to-day at this score level."],
            ["Watch-outs", "risks or blind spots worth being aware of."],
            ["Development Projects", "concrete, on-the-job actions for the areas that would benefit most."],
          ].map(([label, desc]) => (
            <li key={label} style={{ ...reportTypography.bodySmall, color: theme.body, marginBottom: 2 }}>
              <strong style={{ color: theme.ink }}>{label}:</strong> {desc}
            </li>
          ))}
        </ul>
      </GuideSection>

      <p style={{ ...reportTypography.bodyXSmall, color: theme.body, fontStyle: "italic", marginTop: "0.5rem" }}>
        This report is a structured signal to support conversations, interviews and development planning — it works
        best alongside professional judgement and business context, not in place of them.
      </p>
    </div>
  );
}

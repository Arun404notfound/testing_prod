export const ASSIGNMENT_INVITE_TEMPLATE_KEY = "assignment_invite";

export const DEFAULT_ASSIGNMENT_INVITE_SUBJECT = "Assessment assigned: @AssessmentTitle";

export const DEFAULT_ASSIGNMENT_INVITE_BODY = `Hi @CandidateName,

You've been assigned a new assessment: @AssessmentTitle.

Duration: @Duration minutes
Complete before: @Deadline

Click the button below to get started.`;

export const PLACEHOLDER_FIELDS: { token: string; description: string }[] = [
  { token: "@CandidateName", description: "Candidate's full name" },
  { token: "@AssessmentTitle", description: "Title of the assigned assessment" },
  { token: "@Duration", description: "Time limit in minutes — assignment override if set, otherwise the assessment's own duration" },
  { token: "@Deadline", description: "Deadline date, formatted (\"No expiry set — can be completed anytime\" if none)" },
];

export const SAMPLE_PREVIEW_VARS = {
  candidatename: "Priya Sharma",
  assessmenttitle: "First-Time Manager Readiness",
  duration: "45",
  deadline: "20 August 2026, 06:00 PM",
};

export const SAMPLE_PREVIEW_LINK = "https://example.com/candidate/test/sample?token=abc123";

/**
 * Fills in @Placeholder tokens (case-insensitive). Any @word that isn't a
 * known field (e.g. a stray email address like contact@company.com) is left
 * exactly as typed instead of being blanked out.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  const lowerVars = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k.toLowerCase(), v])
  );
  return template.replace(/@(\w+)/g, (match, key: string) => {
    const value = lowerVars[key.toLowerCase()];
    return value !== undefined ? value : match;
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Turns a plain-text message (blank line = new paragraph) into styled HTML, with the CTA button and fallback link always appended. */
export function buildAssignmentEmailHtml(plainBody: string, link: string): string {
  const paragraphs = plainBody
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`
    )
    .join("\n");

  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #0F172A;">
      ${paragraphs}
      <p style="margin: 24px 0;">
        <a href="${link}" style="background: #2563EB; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Start Assessment
        </a>
      </p>
      <p style="font-size: 12px; color: #94A3B8;">
        This link is unique to you — please don't share it. If the button doesn't work, copy this link into your browser:<br />
        <a href="${link}" style="color: #2563EB;">${link}</a>
      </p>
    </div>
  `;
}

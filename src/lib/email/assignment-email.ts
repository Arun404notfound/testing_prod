import { randomBytes } from "node:crypto";
import { sendTransactionalEmail, type SendEmailResult } from "./brevo";

export function generateAccessToken() {
  return randomBytes(24).toString("base64url");
}

function formatDeadline(expiresAt: Date | null) {
  if (!expiresAt) return null;
  return expiresAt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function sendAssignmentAssignedEmail({
  candidateEmail,
  candidateName,
  assessmentTitle,
  link,
  durationMinutes,
  expiresAt,
}: {
  candidateEmail: string;
  candidateName: string;
  assessmentTitle: string;
  link: string;
  durationMinutes: number | null;
  expiresAt: Date | null;
}): Promise<SendEmailResult> {
  const deadline = formatDeadline(expiresAt);

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #0F172A;">
      <p style="font-size: 15px;">Hi ${candidateName},</p>
      <p style="font-size: 15px; line-height: 1.6;">
        You've been assigned a new assessment: <strong>${assessmentTitle}</strong>.
      </p>
      <ul style="font-size: 14px; color: #475569; line-height: 1.8; padding-left: 18px;">
        ${durationMinutes ? `<li>Duration: ${durationMinutes} minutes</li>` : ""}
        ${deadline ? `<li>Complete before: ${deadline}</li>` : ""}
      </ul>
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

  return sendTransactionalEmail({
    to: candidateEmail,
    toName: candidateName,
    subject: `Assessment assigned: ${assessmentTitle}`,
    html,
  });
}

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail, type SendEmailResult } from "./brevo";
import {
  ASSIGNMENT_INVITE_TEMPLATE_KEY,
  DEFAULT_ASSIGNMENT_INVITE_BODY,
  DEFAULT_ASSIGNMENT_INVITE_SUBJECT,
  buildAssignmentEmailHtml,
  renderTemplate,
} from "./template-render";

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
  tenantId,
  candidateEmail,
  candidateName,
  assessmentTitle,
  link,
  durationMinutes,
  expiresAt,
}: {
  tenantId?: string | null;
  candidateEmail: string;
  candidateName: string;
  assessmentTitle: string;
  link: string;
  durationMinutes: number | null;
  expiresAt: Date | null;
}): Promise<SendEmailResult> {
  const deadline = formatDeadline(expiresAt);

  const template = tenantId
    ? await prisma.emailTemplate.findUnique({
        where: { tenantId_key: { tenantId, key: ASSIGNMENT_INVITE_TEMPLATE_KEY } },
      })
    : null;

  const vars = {
    candidatename: candidateName,
    assessmenttitle: assessmentTitle,
    duration: durationMinutes ? String(durationMinutes) : "",
    deadline: deadline ?? "",
  };

  const subject = renderTemplate(template?.subject ?? DEFAULT_ASSIGNMENT_INVITE_SUBJECT, vars);
  const bodyText = renderTemplate(template?.bodyText ?? DEFAULT_ASSIGNMENT_INVITE_BODY, vars);
  const html = buildAssignmentEmailHtml(bodyText, link);

  return sendTransactionalEmail({
    to: candidateEmail,
    toName: candidateName,
    subject,
    html,
  });
}

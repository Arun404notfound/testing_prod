export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendTransactionalEmail({
  to,
  toName,
  subject,
  html,
}: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("[brevo] BREVO_API_KEY not set — skipping email send", { to, subject });
    return { ok: false, error: "not_configured" };
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@example.com";
  const senderName = process.env.BREVO_SENDER_NAME || "AptIQ Assessments";

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[brevo] send failed", { to, status: res.status, body });
      return { ok: false, error: `brevo_error_${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error("[brevo] send threw", { to, err: String(err) });
    return { ok: false, error: "network_error" };
  }
}

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { requireAdminSession } from "@/lib/auth/require-user";
import { logAudit } from "@/lib/audit-log";
import { PageHeader } from "@/components/ui/page-header";
import { AutoDismissToast } from "@/components/ui/auto-dismiss-toast";
import {
  ASSIGNMENT_INVITE_TEMPLATE_KEY,
  DEFAULT_ASSIGNMENT_INVITE_BODY,
  DEFAULT_ASSIGNMENT_INVITE_SUBJECT,
} from "@/lib/email/template-render";
import { MailTemplateEditor } from "./mail-template-editor";

async function saveTemplate(formData: FormData) {
  "use server";
  const session = await requireAdminSession();
  const tenantId = await getDefaultTenantId();

  const subject = String(formData.get("subject") ?? "").trim();
  const bodyText = String(formData.get("bodyText") ?? "").trim();
  if (!subject || !bodyText) redirect("/admin/mail-templates?error=missing");

  await prisma.emailTemplate.upsert({
    where: { tenantId_key: { tenantId, key: ASSIGNMENT_INVITE_TEMPLATE_KEY } },
    update: { subject, bodyText },
    create: { tenantId, key: ASSIGNMENT_INVITE_TEMPLATE_KEY, subject, bodyText },
  });

  await logAudit({
    tenantId,
    actorType: session.role,
    actorId: session.sub,
    action: "email_template_updated",
    entityType: "EmailTemplate",
    entityId: ASSIGNMENT_INVITE_TEMPLATE_KEY,
  });

  revalidatePath("/admin/mail-templates");
  redirect("/admin/mail-templates?success=1");
}

async function resetTemplate() {
  "use server";
  const session = await requireAdminSession();
  const tenantId = await getDefaultTenantId();

  await prisma.emailTemplate.deleteMany({
    where: { tenantId, key: ASSIGNMENT_INVITE_TEMPLATE_KEY },
  });

  await logAudit({
    tenantId,
    actorType: session.role,
    actorId: session.sub,
    action: "email_template_reset",
    entityType: "EmailTemplate",
    entityId: ASSIGNMENT_INVITE_TEMPLATE_KEY,
  });

  revalidatePath("/admin/mail-templates");
  redirect("/admin/mail-templates?success=reset");
}

export default async function MailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const tenantId = await getDefaultTenantId();

  const template = await prisma.emailTemplate.findUnique({
    where: { tenantId_key: { tenantId, key: ASSIGNMENT_INVITE_TEMPLATE_KEY } },
  });

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="Mail Templates"
        subtitle="Edit the email candidates receive when they're assigned an assessment. No HTML needed — just write the message."
      />

      {sp.success === "1" && <AutoDismissToast message="Mail template saved." />}
      {sp.success === "reset" && <AutoDismissToast message="Mail template reset to the default." />}
      {sp.error === "missing" && (
        <AutoDismissToast variant="error" message="Subject and message are both required." />
      )}

      <MailTemplateEditor
        initialSubject={template?.subject ?? DEFAULT_ASSIGNMENT_INVITE_SUBJECT}
        initialBody={template?.bodyText ?? DEFAULT_ASSIGNMENT_INVITE_BODY}
        hasCustomTemplate={Boolean(template)}
        saveTemplate={saveTemplate}
        resetTemplate={resetTemplate}
      />
    </main>
  );
}

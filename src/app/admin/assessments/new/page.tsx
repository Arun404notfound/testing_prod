import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { FormCard } from "@/components/ui/form-card";
import { PageHeader } from "@/components/ui/page-header";
import { AssessmentTenantSelect } from "@/components/admin/assessment-tenant-select";
import { TextField } from "@/components/ui/text-field";
import { getDefaultTenantId } from "@/lib/tenant";
import type { AssessmentLifecycleStatus, AssessmentType, ReportTemplateType } from "@/generated/prisma/enums";
import {
  REPORT_TEMPLATE_LABELS,
  REPORT_TEMPLATE_TYPES,
  defaultReportTemplateForAssessmentType,
  isReportTemplateType,
} from "@/lib/report-layout";
import { CreateAssessmentButton } from "./submit-button";

const ASSESSMENT_TYPES: AssessmentType[] = [
  "KNOWLEDGE_MCQ",
  "LIKERT_PSYCHOMETRIC",
  "FORCED_CHOICE_TRIAD",
  "HYBRID",
];

const LIFECYCLE: AssessmentLifecycleStatus[] = ["draft", "published"];


async function createAssessment(formData: FormData) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assessmentType = String(formData.get("assessmentType") ?? "") as AssessmentType;
  const lifecycleStatus = String(formData.get("lifecycleStatus") ?? "draft") as AssessmentLifecycleStatus;

  if (!title || !description) {
    redirect("/admin/assessments/new?status=error");
  }

  if (!ASSESSMENT_TYPES.includes(assessmentType)) {
    redirect("/admin/assessments/new?status=error");
  }

  const rawReportTemplate = String(formData.get("reportTemplateType") ?? "").trim();
  const reportTemplateType: ReportTemplateType = isReportTemplateType(rawReportTemplate)
    ? rawReportTemplate
    : defaultReportTemplateForAssessmentType(assessmentType);

  if (!LIFECYCLE.includes(lifecycleStatus)) {
    redirect("/admin/assessments/new?status=error");
  }

  const randomizeQuestions = formData.get("randomizeQuestions") === "on";
  const randomizeOptions = formData.get("randomizeOptions") === "on";

  const defaultTenantId = await getDefaultTenantId();
  const rawBrandingTenant = String(formData.get("assessmentTenantId") ?? "").trim();
  let brandingTenantId: string | null = null;
  if (rawBrandingTenant) {
    const row = await prisma.tenant.findFirst({ where: { id: rawBrandingTenant }, select: { id: true } });
    brandingTenantId = row?.id ?? null;
  }

  const reportTemplate = await prisma.reportTemplate.findFirst({
    where: { tenantId: brandingTenantId ?? defaultTenantId, assessmentType },
  });

  let createdId: string;
  try {
    const assessment = await prisma.assessment.create({
      data: {
        tenantId: brandingTenantId,
        reportTemplateId: reportTemplate?.id ?? null,
        reportTemplateType,
        title,
        description,
        assessmentType,
        durationMinutes: 0,
        maxAttempts: 1,
        randomizeQuestions,
        randomizeOptions,
        lifecycleStatus,
        sections: {
          create: [
            {
              title: "Main",
              description: "Primary content for this assessment.",
              displayOrder: 1,
            },
          ],
        },
      },
    });
    createdId = assessment.id;
  } catch {
    redirect("/admin/assessments/new?status=error");
  }

  revalidatePath("/admin/assessments");
  redirect(`/admin/assessments/${createdId}/builder`);
}

export default async function NewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [tenants, defaultTenantId] = await Promise.all([
    prisma.tenant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, logoUrl: true } }),
    getDefaultTenantId(),
  ]);

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="New assessment"
        subtitle="Define metadata, then pick questions or imported pool items in the builder."
        right={
          <Link href="/admin/assessments" className="text-sm font-medium text-[#2563EB] hover:underline">
            Back to list
          </Link>
        }
      />

      {status === "error" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Could not create assessment. Check required fields and try again.
        </div>
      ) : null}

      <FormCard title="Assessment details">
        <form action={createAssessment} className="grid gap-4">
          <TextField name="title" label="Title" />

          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Description</span>
            <textarea name="description" required rows={3} className="tg-input w-full" />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Assessment type</span>
              <select name="assessmentType" required className="tg-input w-full">
                {ASSESSMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Report template</span>
              <select name="reportTemplateType" required className="tg-input w-full">
                {REPORT_TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {REPORT_TEMPLATE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Status</span>
              <select name="lifecycleStatus" required className="tg-input w-full">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <AssessmentTenantSelect tenants={tenants} initialTenantId={defaultTenantId} />

          <div className="flex flex-wrap gap-6 text-sm text-[#334155]">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="randomizeQuestions" className="rounded border-slate-300" />
              Randomize questions
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="randomizeOptions" className="rounded border-slate-300" />
              Randomize MCQ option order
            </label>
          </div>

          <CreateAssessmentButton />
        </form>
      </FormCard>
    </main>
  );
}

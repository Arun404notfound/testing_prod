import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { FormCard } from "@/components/ui/form-card";
import { PageHeader } from "@/components/ui/page-header";
import { AssessmentTenantSelect } from "@/components/admin/assessment-tenant-select";
import { TextField } from "@/components/ui/text-field";
import { getDefaultTenantId } from "@/lib/tenant";
import type { AssessmentLifecycleStatus, AssessmentType, ModuleType } from "@/generated/prisma/enums";
import { defaultReportTemplateForAssessmentType } from "@/lib/report-layout";
import { resolveModuleFields } from "@/lib/assessment-module";
import { attachAssessmentToProgram } from "@/lib/programs";
import { CreateAssessmentButton } from "./submit-button";

const ASSESSMENT_TYPES: AssessmentType[] = [
  "KNOWLEDGE_MCQ",
  "LIKERT_PSYCHOMETRIC",
  "FORCED_CHOICE_TRIAD",
  "HYBRID",
];

const MODULE_TYPES: ModuleType[] = ["PSYCHOMETRIC", "TECHNICAL", "SURVEY"];

const LIFECYCLE: AssessmentLifecycleStatus[] = ["draft", "published"];


async function createAssessment(formData: FormData) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assessmentType = String(formData.get("assessmentType") ?? "") as AssessmentType;
  const moduleType = String(formData.get("moduleType") ?? "PSYCHOMETRIC") as ModuleType;
  const lifecycleStatus = String(formData.get("lifecycleStatus") ?? "draft") as AssessmentLifecycleStatus;
  const programId = String(formData.get("programId") ?? "").trim() || null;

  if (!title || !description) {
    redirect("/admin/assessments/new?status=error");
  }

  if (!ASSESSMENT_TYPES.includes(assessmentType)) {
    redirect("/admin/assessments/new?status=error");
  }

  if (!MODULE_TYPES.includes(moduleType)) {
    redirect("/admin/assessments/new?status=error");
  }

  const reportTemplateType = defaultReportTemplateForAssessmentType(assessmentType);

  const { jobRoleId, skillFrameworkId } = resolveModuleFields(
    moduleType,
    String(formData.get("jobRoleId") ?? "").trim() || null,
    String(formData.get("skillFrameworkId") ?? "").trim() || null,
  );

  if (!LIFECYCLE.includes(lifecycleStatus)) {
    redirect("/admin/assessments/new?status=error");
  }

  const rawDuration = parseInt(String(formData.get("durationMinutes") ?? ""), 10);
  const durationMinutes = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;

  const randomizeQuestions = formData.get("randomizeQuestions") === "on";
  const randomizeOptions = formData.get("randomizeOptions") === "on";

  const defaultTenantId = await getDefaultTenantId();
  const rawBrandingTenant = String(formData.get("assessmentTenantId") ?? "").trim();
  let brandingTenantId: string | null = null;
  if (rawBrandingTenant) {
    const row = await prisma.tenant.findFirst({ where: { id: rawBrandingTenant }, select: { id: true } });
    brandingTenantId = row?.id ?? null;
  }

  // A selected Job Role owns its own report template; a selected Skill
  // Framework does the same for the Technical module; otherwise fall back to
  // the assessmentType-based lookup (legacy path).
  let jobRoleReportTemplateId: string | null = null;
  if (jobRoleId) {
    const jobRole = await prisma.jobRole.findFirst({
      where: { id: jobRoleId, tenantId: brandingTenantId ?? defaultTenantId },
      select: { id: true, reportTemplate: { select: { id: true } } },
    });
    if (!jobRole) redirect("/admin/assessments/new?status=error");
    jobRoleReportTemplateId = jobRole.reportTemplate?.id ?? null;
  }

  let skillFrameworkReportTemplateId: string | null = null;
  if (skillFrameworkId) {
    const skillFramework = await prisma.skillFramework.findFirst({
      where: { id: skillFrameworkId, tenantId: brandingTenantId ?? defaultTenantId },
      select: { id: true, reportTemplate: { select: { id: true } } },
    });
    if (!skillFramework) redirect("/admin/assessments/new?status=error");
    skillFrameworkReportTemplateId = skillFramework.reportTemplate?.id ?? null;
  }

  const reportTemplate = jobRoleId || skillFrameworkId
    ? null
    : await prisma.reportTemplate.findFirst({
        where: { tenantId: brandingTenantId ?? defaultTenantId, assessmentType },
      });

  const resolvedReportTemplateId = jobRoleId
    ? jobRoleReportTemplateId
    : skillFrameworkId
      ? skillFrameworkReportTemplateId
      : reportTemplate?.id ?? null;

  let createdId: string;
  try {
    const assessment = await prisma.assessment.create({
      data: {
        tenantId: brandingTenantId,
        reportTemplateId: resolvedReportTemplateId,
        reportTemplateType,
        jobRoleId,
        skillFrameworkId,
        title,
        description,
        assessmentType,
        moduleType,
        durationMinutes,
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

  if (programId) {
    const attached = await attachAssessmentToProgram(programId, createdId);
    revalidatePath("/admin/programs");
    if (!attached.ok) {
      redirect(`/admin/programs/${programId}/builder?status=error&reason=${encodeURIComponent(attached.error)}`);
    }
    redirect(`/admin/programs/${programId}/builder?status=success`);
  }

  redirect(`/admin/assessments/${createdId}/builder`);
}

export default async function NewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; programId?: string; moduleType?: string }>;
}) {
  const { status, programId, moduleType: lockedModuleType } = await searchParams;
  const [tenants, defaultTenantId] = await Promise.all([
    prisma.tenant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, logoUrl: true } }),
    getDefaultTenantId(),
  ]);
  const [jobRoles, skillFrameworks] = await Promise.all([
    prisma.jobRole.findMany({
      where: { tenantId: defaultTenantId, isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.skillFramework.findMany({
      where: { tenantId: defaultTenantId, isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const isLocked = Boolean(programId && lockedModuleType && MODULE_TYPES.includes(lockedModuleType as ModuleType));

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title={isLocked ? "New module" : "New assessment"}
        subtitle={
          isLocked
            ? "This module will be created and attached to the Program automatically."
            : "Define metadata, then pick questions or imported pool items in the builder."
        }
        right={
          <Link
            href={programId ? `/admin/programs/${programId}/builder` : "/admin/assessments"}
            className="text-sm font-medium text-[#0F766E] hover:underline"
          >
            Back
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
          {programId ? <input type="hidden" name="programId" value={programId} /> : null}

          <TextField name="title" label="Title" />

          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Description</span>
            <textarea name="description" required rows={3} className="tg-input w-full" />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Duration (minutes) <span className="font-normal text-[#94A3B8]">(optional)</span></span>
              <input
                type="number"
                name="durationMinutes"
                min={1}
                max={480}
                placeholder="e.g. 45"
                className="tg-input w-full"
              />
            </label>
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Status</span>
              <select name="lifecycleStatus" required className="tg-input w-full">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Module</span>
            {isLocked ? (
              <>
                <input type="text" disabled value={lockedModuleType} className="tg-input w-full opacity-60" />
                <input type="hidden" name="moduleType" value={lockedModuleType} />
              </>
            ) : (
              <select name="moduleType" required defaultValue="PSYCHOMETRIC" className="tg-input w-full">
                {MODULE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </label>

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
            <span className="mb-1 block font-medium">
              Job role <span className="font-normal text-[#94A3B8]">(Psychometric only — drives competency scoring and report content)</span>
            </span>
            <select name="jobRoleId" defaultValue="" className="tg-input w-full">
              <option value="">None (report layout derived from assessment type)</option>
              {jobRoles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">
              Skill framework <span className="font-normal text-[#94A3B8]">(Technical only — drives skill scoring and report content)</span>
            </span>
            <select name="skillFrameworkId" defaultValue="" className="tg-input w-full">
              <option value="">None (report layout derived from assessment type)</option>
              {skillFrameworks.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>

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

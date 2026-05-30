"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import {
  allowsLikertPool,
  allowsMcqPool,
  allowsTriadPool,
} from "@/lib/assessment-pools";
import type { ReportTemplateType } from "@/generated/prisma/enums";
import { isReportTemplateType } from "@/lib/report-layout";

async function assertAssessment(assessmentId: string) {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId },
    select: { id: true, assessmentType: true },
  });
  if (!assessment) redirect("/admin/assessments");
  return assessment;
}

async function resolveAssessmentTenantIdFromForm(formData: FormData): Promise<string | null> {
  const raw = String(formData.get("assessmentTenantId") ?? "").trim();
  if (!raw) return null;
  const row = await prisma.tenant.findFirst({ where: { id: raw }, select: { id: true } });
  return row?.id ?? null;
}

export async function updateAssessmentBrandingTenant(assessmentId: string, formData: FormData) {
  await assertAssessment(assessmentId);
  const nextTenantId = await resolveAssessmentTenantIdFromForm(formData);
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { tenantId: nextTenantId },
  });
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  revalidatePath("/admin/assessments");
}

export async function updateAssessmentReportTemplate(assessmentId: string, formData: FormData) {
  await assertAssessment(assessmentId);
  const raw = String(formData.get("reportTemplateType") ?? "").trim();
  if (!isReportTemplateType(raw)) return;
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { reportTemplateType: raw as ReportTemplateType },
  });
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  revalidatePath("/admin/assessments");
}

async function primarySectionId(assessmentId: string) {
  const first = await prisma.assessmentSection.findFirst({
    where: { assessmentId },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  if (first) return first.id;
  const created = await prisma.assessmentSection.create({
    data: {
      assessmentId,
      title: "Main",
      description: "Assessment content",
      displayOrder: 1,
    },
    select: { id: true },
  });
  return created.id;
}

/** IDs of all assessments belonging to this tenant — used to scope pool lookups. */
async function tenantAssessmentIds(tenantId: string): Promise<string[]> {
  const rows = await prisma.assessment.findMany({
    where: { tenantId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function addMcqQuestion(assessmentId: string, questionId: string) {
  const tenantId = await getDefaultTenantId();
  const assessment = await assertAssessment(assessmentId);
  if (!allowsMcqPool(assessment.assessmentType)) return;

  const question = await prisma.question.findFirst({
    where: { id: questionId, tenantId },
    select: { id: true },
  });
  if (!question) return;

  await prisma.assessmentQuestion.upsert({
    where: {
      assessmentId_questionId: { assessmentId, questionId },
    },
    create: { assessmentId, questionId },
    update: {},
  });
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  revalidatePath("/admin/assessments");
}

export async function removeMcqQuestion(assessmentId: string, questionId: string) {
  await assertAssessment(assessmentId);
  await prisma.assessmentQuestion.deleteMany({
    where: { assessmentId, questionId },
  });
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  revalidatePath("/admin/assessments");
}

export async function addLikertFromPool(assessmentId: string, poolItemId: string) {
  const tenantId = await getDefaultTenantId();
  const assessment = await assertAssessment(assessmentId);
  if (!allowsLikertPool(assessment.assessmentType)) return;

  const tenantIds = await tenantAssessmentIds(tenantId);
  const item = await prisma.assessmentItem.findFirst({
    where: { id: poolItemId, assessmentId: { in: tenantIds }, itemType: "LIKERT" },
    select: { id: true },
  });
  if (!item) return;

  const dup = await prisma.assessmentCompositionItem.findFirst({
    where: { assessmentId, sourceAssessmentItemId: poolItemId },
  });
  if (dup) return;

  const sectionId = await primarySectionId(assessmentId);
  const maxOrder = await prisma.assessmentCompositionItem.aggregate({
    where: { sectionId },
    _max: { displayOrder: true },
  });
  const displayOrder = (maxOrder._max.displayOrder ?? 0) + 1;

  await prisma.assessmentCompositionItem.create({
    data: {
      assessmentId,
      sectionId,
      displayOrder,
      sourceAssessmentItemId: poolItemId,
    },
  });
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  revalidatePath("/admin/assessments");
}

export async function addTriadFromPool(assessmentId: string, triadGroupId: string) {
  const tenantId = await getDefaultTenantId();
  const assessment = await assertAssessment(assessmentId);
  if (!allowsTriadPool(assessment.assessmentType)) return;

  const tenantIds = await tenantAssessmentIds(tenantId);
  const group = await prisma.triadGroup.findFirst({
    where: { id: triadGroupId, assessmentId: { in: tenantIds } },
    select: { id: true },
  });
  if (!group) return;

  const dup = await prisma.assessmentCompositionItem.findFirst({
    where: { assessmentId, sourceTriadGroupId: triadGroupId },
  });
  if (dup) return;

  const sectionId = await primarySectionId(assessmentId);
  const maxOrder = await prisma.assessmentCompositionItem.aggregate({
    where: { sectionId },
    _max: { displayOrder: true },
  });
  const displayOrder = (maxOrder._max.displayOrder ?? 0) + 1;

  await prisma.assessmentCompositionItem.create({
    data: {
      assessmentId,
      sectionId,
      displayOrder,
      sourceTriadGroupId: triadGroupId,
    },
  });
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  revalidatePath("/admin/assessments");
}

export async function removeCompositionItem(assessmentId: string, compositionItemId: string) {
  await assertAssessment(assessmentId);
  await prisma.assessmentCompositionItem.deleteMany({
    where: { id: compositionItemId, assessmentId },
  });
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  revalidatePath("/admin/assessments");
}

export async function setLifecycleStatus(
  assessmentId: string,
  lifecycleStatus: "draft" | "published",
) {
  await assertAssessment(assessmentId);
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { lifecycleStatus },
  });
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  revalidatePath("/admin/assessments");
}

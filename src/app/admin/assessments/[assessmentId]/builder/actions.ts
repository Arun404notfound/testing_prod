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
import { DEFAULT_INSTRUCTIONS } from "@/lib/default-instructions";
import { serializeCustomInstructions } from "@/lib/custom-instructions";
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

export async function addMcqQuestionsBulk(assessmentId: string, formData: FormData) {
  const tenantId = await getDefaultTenantId();
  const assessment = await assertAssessment(assessmentId);
  if (!allowsMcqPool(assessment.assessmentType)) return;
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (!ids.length) return;
  const questions = await prisma.question.findMany({ where: { id: { in: ids }, tenantId }, select: { id: true } });
  for (const q of questions) {
    await prisma.assessmentQuestion.upsert({
      where: { assessmentId_questionId: { assessmentId, questionId: q.id } },
      create: { assessmentId, questionId: q.id },
      update: {},
    });
  }
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  revalidatePath("/admin/assessments");
}

export async function addLikertFromPoolBulk(assessmentId: string, formData: FormData) {
  const tenantId = await getDefaultTenantId();
  const assessment = await assertAssessment(assessmentId);
  if (!allowsLikertPool(assessment.assessmentType)) return;
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (!ids.length) return;
  const tenantIds = await tenantAssessmentIds(tenantId);
  const items = await prisma.assessmentItem.findMany({
    where: { id: { in: ids }, OR: [{ assessmentId: { in: tenantIds } }, { assessmentId: null }], itemType: "LIKERT" },
    select: { id: true },
  });
  const sectionId = await primarySectionId(assessmentId);
  for (const item of items) {
    const dup = await prisma.assessmentCompositionItem.findFirst({ where: { assessmentId, sourceAssessmentItemId: item.id } });
    if (dup) continue;
    const maxOrder = await prisma.assessmentCompositionItem.aggregate({ where: { sectionId }, _max: { displayOrder: true } });
    await prisma.assessmentCompositionItem.create({
      data: { assessmentId, sectionId, displayOrder: (maxOrder._max.displayOrder ?? 0) + 1, sourceAssessmentItemId: item.id },
    });
  }
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  revalidatePath("/admin/assessments");
}

export async function addTriadFromPoolBulk(assessmentId: string, formData: FormData) {
  const tenantId = await getDefaultTenantId();
  const assessment = await assertAssessment(assessmentId);
  if (!allowsTriadPool(assessment.assessmentType)) return;
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (!ids.length) return;
  const tenantIds = await tenantAssessmentIds(tenantId);
  const groups = await prisma.triadGroup.findMany({
    where: { id: { in: ids }, OR: [{ assessmentId: { in: tenantIds } }, { assessmentId: null }] },
    select: { id: true },
  });
  const sectionId = await primarySectionId(assessmentId);
  for (const group of groups) {
    const dup = await prisma.assessmentCompositionItem.findFirst({ where: { assessmentId, sourceTriadGroupId: group.id } });
    if (dup) continue;
    const maxOrder = await prisma.assessmentCompositionItem.aggregate({ where: { sectionId }, _max: { displayOrder: true } });
    await prisma.assessmentCompositionItem.create({
      data: { assessmentId, sectionId, displayOrder: (maxOrder._max.displayOrder ?? 0) + 1, sourceTriadGroupId: group.id },
    });
  }
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  revalidatePath("/admin/assessments");
}

export async function saveAssessmentDetails(assessmentId: string, formData: FormData) {
  await assertAssessment(assessmentId);
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const duration = parseInt(String(formData.get("durationMinutes") ?? ""), 10);
  const randomizeQuestions = formData.get("randomizeQuestions") === "on";
  const randomizeOptions = formData.get("randomizeOptions") === "on";
  if (!title) return;
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      title,
      ...(description && { description }),
      ...(Number.isFinite(duration) && duration > 0 && { durationMinutes: duration }),
      randomizeQuestions,
      randomizeOptions,
    },
  });
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  revalidatePath("/admin/assessments");
  redirect(`/admin/assessments/${assessmentId}/builder?saved=details`);
}

function parseJsonArray(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function updateAssessmentInstructions(assessmentId: string, formData: FormData) {
  await assertAssessment(assessmentId);

  const validKeys = new Set(DEFAULT_INSTRUCTIONS.map((d) => d.key));
  const defaultsConfig = parseJsonArray(String(formData.get("defaultsConfig") ?? "[]"))
    .filter((item): item is { key: string; enabled: boolean } => {
      const o = item as Record<string, unknown>;
      return typeof o?.key === "string" && validKeys.has(o.key);
    });
  const defaultOrder = defaultsConfig.map((d) => d.key);
  const disabledDefaults = defaultsConfig.filter((d) => d.enabled === false).map((d) => d.key);

  const customPoints = parseJsonArray(String(formData.get("customPointsConfig") ?? "[]"))
    .map((item) => {
      const o = item as Record<string, unknown>;
      const text = typeof o?.text === "string" ? o.text.trim() : "";
      return text ? { text, enabled: o.enabled !== false } : null;
    })
    .filter((p): p is { text: string; enabled: boolean } => p !== null);

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { customInstructions: serializeCustomInstructions({ defaultOrder, disabledDefaults, customPoints }) },
  });
  revalidatePath(`/admin/assessments/${assessmentId}/builder`);
  redirect(`/admin/assessments/${assessmentId}/builder?saved=instructions`);
}

export async function deleteAssessmentById(assessmentId: string) {
  await assertAssessment(assessmentId);
  await prisma.assessment.delete({ where: { id: assessmentId } });
  revalidatePath("/admin/assessments");
  redirect("/admin/assessments");
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

export async function updateAssessmentJobRole(assessmentId: string, formData: FormData) {
  await assertAssessment(assessmentId);
  const raw = String(formData.get("jobRoleId") ?? "").trim();
  const jobRoleId = raw || null;
  const jobRole = jobRoleId
    ? await prisma.jobRole.findFirst({ where: { id: jobRoleId }, select: { id: true, reportTemplate: { select: { id: true } } } })
    : null;
  if (jobRoleId && !jobRole) return;
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      jobRoleId,
      // A Job Role's own report template takes over; clearing the Job Role
      // leaves reportTemplateId untouched (falls back to assessmentType lookup).
      ...(jobRoleId ? { reportTemplateId: jobRole?.reportTemplate?.id ?? null } : {}),
    },
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

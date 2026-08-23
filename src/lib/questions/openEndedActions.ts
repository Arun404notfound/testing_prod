"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { collectQuestionAudio, collectQuestionImages } from "@/lib/question-media-upload";

async function nextBankItemDisplayOrder(): Promise<number> {
  const agg = await prisma.assessmentItem.aggregate({
    where: { sectionId: null },
    _max: { displayOrder: true },
  });
  return (agg._max.displayOrder ?? 0) + 1;
}

/**
 * Shared by Technical and Survey Questions — both module's Open-Ended tab is
 * identical (prompt + optional Skill/SubSkill tag + weightage, no options).
 * `basePath` is bound per page (e.g. "/admin/questions/technical") so the
 * redirect lands back on whichever module page submitted the form.
 */
export async function createOpenEndedItem(basePath: string, formData: FormData) {
  const prompt = String(formData.get("prompt") ?? "").trim();
  const helpText = String(formData.get("helpText") ?? "").trim() || null;
  const skillId = String(formData.get("skillId") ?? "").trim() || null;
  const subSkillId = String(formData.get("subSkillId") ?? "").trim() || null;
  const weightageRaw = parseFloat(String(formData.get("weightage") ?? "1"));
  const weightage = Number.isFinite(weightageRaw) && weightageRaw > 0 ? weightageRaw : 1;

  if (!prompt) redirect(`${basePath}?tab=open_ended&status=error&reason=missing`);

  const images = await collectQuestionImages(formData);
  const audioUrl = await collectQuestionAudio(formData);

  const displayOrder = await nextBankItemDisplayOrder();
  try {
    await prisma.assessmentItem.create({
      data: {
        itemType: "OPEN_ENDED", prompt, helpText, skillId, subSkillId, weightage, displayOrder, audioUrl,
        images: images.length > 0 ? { create: images.map((url, i) => ({ url, displayOrder: i })) } : undefined,
      },
    });
  } catch {
    redirect(`${basePath}?tab=open_ended&status=error&reason=db`);
  }
  redirect(`${basePath}?tab=open_ended&status=success`);
}

export async function deleteOpenEndedItem(basePath: string, formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.assessmentItem.delete({ where: { id } }).catch(() => {});
  redirect(`${basePath}?tab=open_ended`);
}

export async function updateOpenEndedSkill(basePath: string, formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "").trim();
  const skillId = String(formData.get("skillId") ?? "").trim() || null;
  const subSkillId = String(formData.get("subSkillId") ?? "").trim() || null;
  if (!itemId) redirect(`${basePath}?tab=open_ended`);
  await prisma.assessmentItem.update({ where: { id: itemId }, data: { skillId, subSkillId } }).catch(() => {});
  redirect(`${basePath}?tab=open_ended&status=success`);
}

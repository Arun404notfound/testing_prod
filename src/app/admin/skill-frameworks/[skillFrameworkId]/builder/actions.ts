"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";

async function assertSkillFramework(skillFrameworkId: string) {
  const skillFramework = await prisma.skillFramework.findFirst({ where: { id: skillFrameworkId }, select: { id: true } });
  if (!skillFramework) redirect("/admin/skill-frameworks");
  return skillFramework;
}

function builderPath(skillFrameworkId: string, tab: string, extra = "", hash = "") {
  return `/admin/skill-frameworks/${skillFrameworkId}/builder?tab=${tab}${extra}${hash ? `#${hash}` : ""}`;
}

/** Builds a Mapping-tab redirect that preserves which domain/competency was open, so a
 * create/edit/delete/reorder doesn't collapse the tree back to fully closed, plus a
 * scroll-anchor hash so the browser lands back near the row that was acted on instead
 * of jumping to the top of the page. */
function mappingPath(
  skillFrameworkId: string,
  opts: { openDomain?: string | null; openComp?: string | null; status?: string; hash?: string },
) {
  const usp = new URLSearchParams();
  usp.set("tab", "mapping");
  if (opts.openDomain) usp.set("openDomain", opts.openDomain);
  if (opts.openComp) usp.set("openComp", opts.openComp);
  if (opts.status) usp.set("status", opts.status);
  const hash = opts.hash ? `#${opts.hash}` : "";
  return `/admin/skill-frameworks/${skillFrameworkId}/builder?${usp.toString()}${hash}`;
}

function revalidateSkillFramework(skillFrameworkId: string) {
  revalidatePath("/admin/skill-frameworks");
  revalidatePath(`/admin/skill-frameworks/${skillFrameworkId}/builder`);
}

// ─── Skill Framework details ─────────────────────────────────────────────────

export async function updateSkillFrameworkDetails(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";
  if (!name) redirect(builderPath(skillFrameworkId, "details", "&status=error"));
  try {
    await prisma.skillFramework.update({ where: { id: skillFrameworkId }, data: { name, slug, description, isActive } });
  } catch {
    redirect(builderPath(skillFrameworkId, "details", "&status=error"));
  }
  revalidateSkillFramework(skillFrameworkId);
  redirect(builderPath(skillFrameworkId, "details", "&status=success"));
}

export async function deleteSkillFrameworkById(skillFrameworkId: string) {
  await prisma.skillFramework.delete({ where: { id: skillFrameworkId } }).catch(() => {});
  revalidatePath("/admin/skill-frameworks");
  redirect("/admin/skill-frameworks");
}

// ─── Skill Domains ───────────────────────────────────────────────────────────

export async function createSkillDomain(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const tenantId = await getDefaultTenantId();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) redirect(mappingPath(skillFrameworkId, { status: "error" }));
  let created;
  try {
    const count = await prisma.skillDomain.count({ where: { skillFrameworkId } });
    created = await prisma.skillDomain.create({ data: { tenantId, skillFrameworkId, name, description, displayOrder: count } });
  } catch {
    redirect(mappingPath(skillFrameworkId, { status: "error" }));
  }
  revalidateSkillFramework(skillFrameworkId);
  redirect(mappingPath(skillFrameworkId, { openDomain: created.id, status: "success", hash: `domain-${created.id}` }));
}

export async function updateSkillDomain(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!id || !name) redirect(mappingPath(skillFrameworkId, { status: "error" }));
  try {
    await prisma.skillDomain.update({ where: { id }, data: { name, description } });
  } catch {
    redirect(mappingPath(skillFrameworkId, { openDomain: id, status: "error", hash: `domain-${id}` }));
  }
  revalidateSkillFramework(skillFrameworkId);
  redirect(mappingPath(skillFrameworkId, { openDomain: id, status: "success", hash: `domain-${id}` }));
}

export async function deleteSkillDomain(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.skillDomain.delete({ where: { id } }).catch(() => {});
  revalidateSkillFramework(skillFrameworkId);
  redirect(mappingPath(skillFrameworkId, {}));
}

export async function reorderSkillDomain(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const id = String(formData.get("id") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  const siblings = await prisma.skillDomain.findMany({ where: { skillFrameworkId }, orderBy: { displayOrder: "asc" } });
  const index = siblings.findIndex((d) => d.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= siblings.length) {
    redirect(mappingPath(skillFrameworkId, { openDomain, hash: `domain-${id}` }));
  }
  const a = siblings[index];
  const b = siblings[swapWith];
  await prisma.$transaction([
    prisma.skillDomain.update({ where: { id: a.id }, data: { displayOrder: b.displayOrder } }),
    prisma.skillDomain.update({ where: { id: b.id }, data: { displayOrder: a.displayOrder } }),
  ]);
  revalidateSkillFramework(skillFrameworkId);
  redirect(mappingPath(skillFrameworkId, { openDomain, hash: `domain-${id}` }));
}

// ─── Skill Competencies ──────────────────────────────────────────────────────

export async function createSkillCompetency(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const tenantId = await getDefaultTenantId();
  const skillDomainId = String(formData.get("skillDomainId") ?? "").trim() || null;
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const reportDescription = String(formData.get("reportDescription") ?? "").trim() || null;
  const scoringFormula = String(formData.get("scoringFormula") ?? "WEIGHTED_AVERAGE").trim();
  const proficiencyScale = String(formData.get("proficiencyScale") ?? "MATURITY_4").trim();
  if (!name) redirect(mappingPath(skillFrameworkId, { openDomain, status: "error" }));
  let created;
  try {
    const count = await prisma.skillCompetency.count({ where: { skillFrameworkId } });
    created = await prisma.skillCompetency.create({
      data: {
        tenantId, skillFrameworkId, skillDomainId, name, description, reportDescription, scoringFormula,
        proficiencyScale, displayOrder: count,
      },
    });
  } catch {
    redirect(mappingPath(skillFrameworkId, { openDomain, status: "error" }));
  }
  revalidateSkillFramework(skillFrameworkId);
  redirect(mappingPath(skillFrameworkId, { openDomain, openComp: created.id, status: "success", hash: `comp-${created.id}` }));
}

export async function updateSkillCompetency(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const id = String(formData.get("id") ?? "").trim();
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  const skillDomainId = String(formData.get("skillDomainId") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const reportDescription = String(formData.get("reportDescription") ?? "").trim() || null;
  const scoringFormula = String(formData.get("scoringFormula") ?? "WEIGHTED_AVERAGE").trim();
  const proficiencyScale = String(formData.get("proficiencyScale") ?? "MATURITY_4").trim();
  const strengthStatement = String(formData.get("strengthStatement") ?? "").trim() || null;
  const developmentNeedStatement = String(formData.get("developmentNeedStatement") ?? "").trim() || null;
  if (!id || !name) redirect(mappingPath(skillFrameworkId, { openDomain, openComp: id, status: "error", hash: `comp-${id}` }));
  try {
    await prisma.skillCompetency.update({
      where: { id },
      data: {
        skillDomainId, name, description, reportDescription, scoringFormula, proficiencyScale,
        strengthStatement, developmentNeedStatement,
      },
    });
  } catch {
    redirect(mappingPath(skillFrameworkId, { openDomain, openComp: id, status: "error", hash: `comp-${id}` }));
  }
  revalidateSkillFramework(skillFrameworkId);
  redirect(mappingPath(skillFrameworkId, { openDomain, openComp: id, status: "success", hash: `comp-${id}` }));
}

export async function deleteSkillCompetency(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const id = String(formData.get("id") ?? "").trim();
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  if (!id) return;
  await prisma.skillCompetency.delete({ where: { id } }).catch(() => {});
  revalidateSkillFramework(skillFrameworkId);
  redirect(mappingPath(skillFrameworkId, { openDomain, hash: openDomain ? `domain-${openDomain}` : "" }));
}

export async function reorderSkillCompetency(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const id = String(formData.get("id") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();
  const skillDomainId = String(formData.get("skillDomainId") ?? "").trim() || null;
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  const siblings = await prisma.skillCompetency.findMany({
    where: { skillFrameworkId, skillDomainId },
    orderBy: { displayOrder: "asc" },
  });
  const index = siblings.findIndex((c) => c.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= siblings.length) {
    redirect(mappingPath(skillFrameworkId, { openDomain, openComp: id, hash: `comp-${id}` }));
  }
  const a = siblings[index];
  const b = siblings[swapWith];
  await prisma.$transaction([
    prisma.skillCompetency.update({ where: { id: a.id }, data: { displayOrder: b.displayOrder } }),
    prisma.skillCompetency.update({ where: { id: b.id }, data: { displayOrder: a.displayOrder } }),
  ]);
  revalidateSkillFramework(skillFrameworkId);
  redirect(mappingPath(skillFrameworkId, { openDomain, openComp: id, hash: `comp-${id}` }));
}

// ─── Sub-Skill Mappings ──────────────────────────────────────────────────────

export async function createSkillCompetencyMap(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const subSkillId = String(formData.get("subSkillId") ?? "").trim();
  const skillCompetencyId = String(formData.get("skillCompetencyId") ?? "").trim();
  const weight = parseFloat(String(formData.get("weight") ?? "1"));
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  const openComp = String(formData.get("openComp") ?? "").trim() || skillCompetencyId || null;
  if (!subSkillId || !skillCompetencyId) redirect(mappingPath(skillFrameworkId, { openDomain, openComp, status: "error" }));
  try {
    await prisma.skillCompetencyMap.upsert({
      where: { subSkillId_skillCompetencyId: { subSkillId, skillCompetencyId } },
      create: { subSkillId, skillCompetencyId, weight: isFinite(weight) ? weight : 1 },
      update: { weight: isFinite(weight) ? weight : 1 },
    });
  } catch {
    redirect(mappingPath(skillFrameworkId, { openDomain, openComp, status: "error", hash: `comp-${skillCompetencyId}` }));
  }
  revalidateSkillFramework(skillFrameworkId);
  redirect(mappingPath(skillFrameworkId, { openDomain, openComp, status: "success", hash: `comp-${skillCompetencyId}` }));
}

export async function deleteSkillCompetencyMap(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const id = String(formData.get("id") ?? "").trim();
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  const openComp = String(formData.get("openComp") ?? "").trim() || null;
  if (!id) return;
  await prisma.skillCompetencyMap.delete({ where: { id } }).catch(() => {});
  revalidateSkillFramework(skillFrameworkId);
  redirect(mappingPath(skillFrameworkId, { openDomain, openComp, hash: openComp ? `comp-${openComp}` : "" }));
}

export async function bulkUpdateSkillWeights(skillFrameworkId: string, updates: { id: string; weight: number }[]) {
  if (!updates.length) return;
  await Promise.all(
    updates.map((u) =>
      prisma.skillCompetencyMap.update({
        where: { id: u.id },
        data: { weight: isFinite(u.weight) && u.weight > 0 ? u.weight : 1 },
      }).catch(() => {})
    )
  );
  revalidateSkillFramework(skillFrameworkId);
}

// ─── Report Content ──────────────────────────────────────────────────────────

export async function updateSkillCompetencyBandContent(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const skillCompetencyId = String(formData.get("skillCompetencyId") ?? "").trim();
  const band = String(formData.get("band") ?? "").trim();
  const proficiencyDescription = String(formData.get("proficiencyDescription") ?? "").trim();
  const behaviouralImplications = String(formData.get("behaviouralImplications") ?? "").trim();
  const watchOuts = String(formData.get("watchOuts") ?? "").trim();
  if (!skillCompetencyId || !band) redirect(builderPath(skillFrameworkId, "content", "&status=error"));
  try {
    await prisma.skillCompetencyBandContent.upsert({
      where: { skillCompetencyId_band: { skillCompetencyId, band } },
      create: { skillCompetencyId, band, proficiencyDescription, behaviouralImplications, watchOuts },
      update: { proficiencyDescription, behaviouralImplications, watchOuts },
    });
  } catch {
    redirect(builderPath(skillFrameworkId, "content", `&comp=${skillCompetencyId}&status=error`, `band-${band}`));
  }
  revalidateSkillFramework(skillFrameworkId);
  redirect(builderPath(skillFrameworkId, "content", `&comp=${skillCompetencyId}&status=success`, `band-${band}`));
}

export async function upsertSkillDevelopmentProject(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const skillCompetencyId = String(formData.get("skillCompetencyId") ?? "").trim();
  const displayOrder = parseInt(String(formData.get("displayOrder") ?? "0"), 10) || 0;
  const title = String(formData.get("title") ?? "").trim();
  const whatToDo = String(formData.get("whatToDo") ?? "").trim();
  const howToDoIt = String(formData.get("howToDoIt") ?? "").trim();
  const evidence = String(formData.get("evidence") ?? "").trim();
  if (!skillCompetencyId || !title) redirect(builderPath(skillFrameworkId, "content", `&comp=${skillCompetencyId}&status=error`));
  let projectId = id;
  try {
    if (id) {
      await prisma.skillDevelopmentProject.update({ where: { id }, data: { title, whatToDo, howToDoIt, evidence } });
    } else {
      const proj = await prisma.skillDevelopmentProject.create({
        data: { skillCompetencyId, displayOrder, title, whatToDo, howToDoIt, evidence },
      });
      projectId = proj.id;
    }
  } catch {
    redirect(builderPath(skillFrameworkId, "content", `&comp=${skillCompetencyId}&status=error`));
  }
  revalidateSkillFramework(skillFrameworkId);
  redirect(builderPath(skillFrameworkId, "content", `&comp=${skillCompetencyId}&status=success`, projectId ? `project-${projectId}` : "development-projects"));
}

export async function deleteSkillDevelopmentProject(skillFrameworkId: string, formData: FormData) {
  await assertSkillFramework(skillFrameworkId);
  const id = String(formData.get("id") ?? "").trim();
  const skillCompetencyId = String(formData.get("skillCompetencyId") ?? "").trim();
  if (!id) return;
  await prisma.skillDevelopmentProject.delete({ where: { id } }).catch(() => {});
  revalidateSkillFramework(skillFrameworkId);
  redirect(builderPath(skillFrameworkId, "content", `&comp=${skillCompetencyId}`, "development-projects"));
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";

async function assertJobRole(jobRoleId: string) {
  const jobRole = await prisma.jobRole.findFirst({ where: { id: jobRoleId }, select: { id: true } });
  if (!jobRole) redirect("/admin/job-roles");
  return jobRole;
}

function builderPath(jobRoleId: string, tab: string, extra = "", hash = "") {
  return `/admin/job-roles/${jobRoleId}/builder?tab=${tab}${extra}${hash ? `#${hash}` : ""}`;
}

/** Builds a Mapping-tab redirect that preserves which domain/competency was open, so a
 * create/edit/delete/reorder doesn't collapse the tree back to fully closed, plus a
 * scroll-anchor hash so the browser lands back near the row that was acted on instead
 * of jumping to the top of the page. */
function mappingPath(
  jobRoleId: string,
  opts: { openDomain?: string | null; openComp?: string | null; status?: string; hash?: string },
) {
  const usp = new URLSearchParams();
  usp.set("tab", "mapping");
  if (opts.openDomain) usp.set("openDomain", opts.openDomain);
  if (opts.openComp) usp.set("openComp", opts.openComp);
  if (opts.status) usp.set("status", opts.status);
  const hash = opts.hash ? `#${opts.hash}` : "";
  return `/admin/job-roles/${jobRoleId}/builder?${usp.toString()}${hash}`;
}

function revalidateJobRole(jobRoleId: string) {
  revalidatePath("/admin/job-roles");
  revalidatePath(`/admin/job-roles/${jobRoleId}/builder`);
}

// ─── Job Role details ────────────────────────────────────────────────────────

export async function updateJobRoleDetails(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";
  if (!name) redirect(builderPath(jobRoleId, "details", "&status=error"));
  try {
    await prisma.jobRole.update({ where: { id: jobRoleId }, data: { name, slug, description, isActive } });
  } catch {
    redirect(builderPath(jobRoleId, "details", "&status=error"));
  }
  revalidateJobRole(jobRoleId);
  redirect(builderPath(jobRoleId, "details", "&status=success"));
}

export async function deleteJobRoleById(jobRoleId: string) {
  await prisma.jobRole.delete({ where: { id: jobRoleId } }).catch(() => {});
  revalidatePath("/admin/job-roles");
  redirect("/admin/job-roles");
}

// ─── Domains ─────────────────────────────────────────────────────────────────

export async function createDomain(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const tenantId = await getDefaultTenantId();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) redirect(mappingPath(jobRoleId, { status: "error" }));
  let created;
  try {
    const count = await prisma.domain.count({ where: { jobRoleId } });
    created = await prisma.domain.create({ data: { tenantId, jobRoleId, name, description, displayOrder: count } });
  } catch {
    redirect(mappingPath(jobRoleId, { status: "error" }));
  }
  revalidateJobRole(jobRoleId);
  redirect(mappingPath(jobRoleId, { openDomain: created.id, status: "success", hash: `domain-${created.id}` }));
}

export async function updateDomain(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!id || !name) redirect(mappingPath(jobRoleId, { status: "error" }));
  try {
    await prisma.domain.update({ where: { id }, data: { name, description } });
  } catch {
    redirect(mappingPath(jobRoleId, { openDomain: id, status: "error", hash: `domain-${id}` }));
  }
  revalidateJobRole(jobRoleId);
  redirect(mappingPath(jobRoleId, { openDomain: id, status: "success", hash: `domain-${id}` }));
}

export async function deleteDomain(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.domain.delete({ where: { id } }).catch(() => {});
  revalidateJobRole(jobRoleId);
  redirect(mappingPath(jobRoleId, {}));
}

export async function reorderDomain(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const id = String(formData.get("id") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  const siblings = await prisma.domain.findMany({ where: { jobRoleId }, orderBy: { displayOrder: "asc" } });
  const index = siblings.findIndex((d) => d.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= siblings.length) {
    redirect(mappingPath(jobRoleId, { openDomain, hash: `domain-${id}` }));
  }
  const a = siblings[index];
  const b = siblings[swapWith];
  await prisma.$transaction([
    prisma.domain.update({ where: { id: a.id }, data: { displayOrder: b.displayOrder } }),
    prisma.domain.update({ where: { id: b.id }, data: { displayOrder: a.displayOrder } }),
  ]);
  revalidateJobRole(jobRoleId);
  redirect(mappingPath(jobRoleId, { openDomain, hash: `domain-${id}` }));
}

// ─── Competencies ────────────────────────────────────────────────────────────

export async function createCompetency(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const tenantId = await getDefaultTenantId();
  const domainId = String(formData.get("domainId") ?? "").trim() || null;
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const reportDescription = String(formData.get("reportDescription") ?? "").trim() || null;
  const scoringFormula = String(formData.get("scoringFormula") ?? "WEIGHTED_AVERAGE").trim();
  const proficiencyScale = String(formData.get("proficiencyScale") ?? "MATURITY_4").trim();
  if (!name) redirect(mappingPath(jobRoleId, { openDomain, status: "error" }));
  let created;
  try {
    const count = await prisma.competency.count({ where: { jobRoleId } });
    created = await prisma.competency.create({
      data: {
        tenantId, jobRoleId, domainId, name, description, reportDescription, scoringFormula,
        proficiencyScale, displayOrder: count,
      },
    });
  } catch {
    redirect(mappingPath(jobRoleId, { openDomain, status: "error" }));
  }
  revalidateJobRole(jobRoleId);
  redirect(mappingPath(jobRoleId, { openDomain, openComp: created.id, status: "success", hash: `comp-${created.id}` }));
}

export async function updateCompetency(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const id = String(formData.get("id") ?? "").trim();
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  const domainId = String(formData.get("domainId") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const reportDescription = String(formData.get("reportDescription") ?? "").trim() || null;
  const scoringFormula = String(formData.get("scoringFormula") ?? "WEIGHTED_AVERAGE").trim();
  const proficiencyScale = String(formData.get("proficiencyScale") ?? "MATURITY_4").trim();
  const strengthStatement = String(formData.get("strengthStatement") ?? "").trim() || null;
  const developmentNeedStatement = String(formData.get("developmentNeedStatement") ?? "").trim() || null;
  if (!id || !name) redirect(mappingPath(jobRoleId, { openDomain, openComp: id, status: "error", hash: `comp-${id}` }));
  try {
    await prisma.competency.update({
      where: { id },
      data: {
        domainId, name, description, reportDescription, scoringFormula, proficiencyScale,
        strengthStatement, developmentNeedStatement,
      },
    });
  } catch {
    redirect(mappingPath(jobRoleId, { openDomain, openComp: id, status: "error", hash: `comp-${id}` }));
  }
  revalidateJobRole(jobRoleId);
  redirect(mappingPath(jobRoleId, { openDomain, openComp: id, status: "success", hash: `comp-${id}` }));
}

export async function deleteCompetency(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const id = String(formData.get("id") ?? "").trim();
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  if (!id) return;
  await prisma.competency.delete({ where: { id } }).catch(() => {});
  revalidateJobRole(jobRoleId);
  redirect(mappingPath(jobRoleId, { openDomain, hash: openDomain ? `domain-${openDomain}` : "" }));
}

export async function reorderCompetency(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const id = String(formData.get("id") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();
  const domainId = String(formData.get("domainId") ?? "").trim() || null;
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  const siblings = await prisma.competency.findMany({
    where: { jobRoleId, domainId },
    orderBy: { displayOrder: "asc" },
  });
  const index = siblings.findIndex((c) => c.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= siblings.length) {
    redirect(mappingPath(jobRoleId, { openDomain, openComp: id, hash: `comp-${id}` }));
  }
  const a = siblings[index];
  const b = siblings[swapWith];
  await prisma.$transaction([
    prisma.competency.update({ where: { id: a.id }, data: { displayOrder: b.displayOrder } }),
    prisma.competency.update({ where: { id: b.id }, data: { displayOrder: a.displayOrder } }),
  ]);
  revalidateJobRole(jobRoleId);
  redirect(mappingPath(jobRoleId, { openDomain, openComp: id, hash: `comp-${id}` }));
}

// ─── Attribute Mappings ──────────────────────────────────────────────────────

export async function createMapping(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const attributeId = String(formData.get("attributeId") ?? "").trim();
  const competencyId = String(formData.get("competencyId") ?? "").trim();
  const weight = parseFloat(String(formData.get("weight") ?? "1"));
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  const openComp = String(formData.get("openComp") ?? "").trim() || competencyId || null;
  if (!attributeId || !competencyId) redirect(mappingPath(jobRoleId, { openDomain, openComp, status: "error" }));
  try {
    await prisma.attributeCompetencyMap.upsert({
      where: { attributeId_competencyId: { attributeId, competencyId } },
      create: { attributeId, competencyId, weight: isFinite(weight) ? weight : 1 },
      update: { weight: isFinite(weight) ? weight : 1 },
    });
  } catch {
    redirect(mappingPath(jobRoleId, { openDomain, openComp, status: "error", hash: `comp-${competencyId}` }));
  }
  revalidateJobRole(jobRoleId);
  redirect(mappingPath(jobRoleId, { openDomain, openComp, status: "success", hash: `comp-${competencyId}` }));
}

export async function deleteMapping(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const id = String(formData.get("id") ?? "").trim();
  const openDomain = String(formData.get("openDomain") ?? "").trim() || null;
  const openComp = String(formData.get("openComp") ?? "").trim() || null;
  if (!id) return;
  await prisma.attributeCompetencyMap.delete({ where: { id } }).catch(() => {});
  revalidateJobRole(jobRoleId);
  redirect(mappingPath(jobRoleId, { openDomain, openComp, hash: openComp ? `comp-${openComp}` : "" }));
}

export async function bulkUpdateWeights(jobRoleId: string, updates: { id: string; weight: number }[]) {
  if (!updates.length) return;
  await Promise.all(
    updates.map((u) =>
      prisma.attributeCompetencyMap.update({
        where: { id: u.id },
        data: { weight: isFinite(u.weight) && u.weight > 0 ? u.weight : 1 },
      }).catch(() => {})
    )
  );
  revalidateJobRole(jobRoleId);
}

// ─── Report Content ──────────────────────────────────────────────────────────

export async function updateBandContent(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const competencyId = String(formData.get("competencyId") ?? "").trim();
  const band = String(formData.get("band") ?? "").trim();
  const proficiencyDescription = String(formData.get("proficiencyDescription") ?? "").trim();
  const behaviouralImplications = String(formData.get("behaviouralImplications") ?? "").trim();
  const watchOuts = String(formData.get("watchOuts") ?? "").trim();
  if (!competencyId || !band) redirect(builderPath(jobRoleId, "content", "&status=error"));
  try {
    await prisma.competencyBandContent.upsert({
      where: { competencyId_band: { competencyId, band } },
      create: { competencyId, band, proficiencyDescription, behaviouralImplications, watchOuts },
      update: { proficiencyDescription, behaviouralImplications, watchOuts },
    });
  } catch {
    redirect(builderPath(jobRoleId, "content", `&comp=${competencyId}&status=error`, `band-${band}`));
  }
  revalidateJobRole(jobRoleId);
  redirect(builderPath(jobRoleId, "content", `&comp=${competencyId}&status=success`, `band-${band}`));
}

export async function upsertProject(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const competencyId = String(formData.get("competencyId") ?? "").trim();
  const displayOrder = parseInt(String(formData.get("displayOrder") ?? "0"), 10) || 0;
  const title = String(formData.get("title") ?? "").trim();
  const whatToDo = String(formData.get("whatToDo") ?? "").trim();
  const howToDoIt = String(formData.get("howToDoIt") ?? "").trim();
  const evidence = String(formData.get("evidence") ?? "").trim();
  if (!competencyId || !title) redirect(builderPath(jobRoleId, "content", `&comp=${competencyId}&status=error`));
  let projectId = id;
  try {
    if (id) {
      await prisma.developmentProject.update({ where: { id }, data: { title, whatToDo, howToDoIt, evidence } });
    } else {
      const proj = await prisma.developmentProject.create({
        data: { competencyId, displayOrder, title, whatToDo, howToDoIt, evidence },
      });
      projectId = proj.id;
    }
  } catch {
    redirect(builderPath(jobRoleId, "content", `&comp=${competencyId}&status=error`));
  }
  revalidateJobRole(jobRoleId);
  redirect(builderPath(jobRoleId, "content", `&comp=${competencyId}&status=success`, projectId ? `project-${projectId}` : "development-projects"));
}

export async function deleteProject(jobRoleId: string, formData: FormData) {
  await assertJobRole(jobRoleId);
  const id = String(formData.get("id") ?? "").trim();
  const competencyId = String(formData.get("competencyId") ?? "").trim();
  if (!id) return;
  await prisma.developmentProject.delete({ where: { id } }).catch(() => {});
  revalidateJobRole(jobRoleId);
  redirect(builderPath(jobRoleId, "content", `&comp=${competencyId}`, "development-projects"));
}

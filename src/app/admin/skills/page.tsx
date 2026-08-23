import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { BackToDashboard } from "@/components/ui/back-to-dashboard";
import { AutoDismissToast } from "@/components/ui/auto-dismiss-toast";

// ─── Server actions ──────────────────────────────────────────────────────────

async function createSkill(formData: FormData) {
  "use server";
  const tenantId = await getDefaultTenantId();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) redirect("/admin/skills?status=error");
  try {
    const count = await prisma.skill.count({ where: { tenantId } });
    await prisma.skill.create({ data: { tenantId, name, description, displayOrder: count } });
  } catch {
    redirect("/admin/skills?status=error");
  }
  revalidatePath("/admin/skills");
  redirect("/admin/skills?status=success");
}

async function deleteSkill(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.skill.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/skills");
}

async function createSubSkill(formData: FormData) {
  "use server";
  const skillId = String(formData.get("skillId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!skillId || !name) redirect("/admin/skills?status=error");
  try {
    const count = await prisma.subSkill.count({ where: { skillId } });
    await prisma.subSkill.create({ data: { skillId, name, description, displayOrder: count } });
  } catch {
    redirect("/admin/skills?status=error");
  }
  revalidatePath("/admin/skills");
  redirect("/admin/skills?status=success");
}

async function deleteSubSkill(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.subSkill.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/skills");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const tenantId = await getDefaultTenantId();

  const skills = await prisma.skill.findMany({
    where: { tenantId },
    orderBy: { displayOrder: "asc" },
    include: { subSkills: { orderBy: { displayOrder: "asc" } } },
  });

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="Skills"
        subtitle="Skill is the loose category (like an Attribute's category); Sub-Skill is the measurable leaf tagged onto Technical/Survey questions and mapped into a Skill Framework's competencies."
        right={<BackToDashboard />}
      />

      {status === "success" ? <AutoDismissToast message="Saved successfully." variant="success" /> : null}
      {status === "error" ? <AutoDismissToast message="Something went wrong. Check your input and try again." variant="error" /> : null}

      <div className="tg-card overflow-hidden">
        <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3">
          <h2 className="text-sm font-semibold text-[#0F172A]">Add Skill</h2>
        </div>
        <form action={createSkill} className="grid gap-3 p-5 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Name *</span>
            <input name="name" required placeholder="e.g. Backend Engineering" className="tg-input" />
          </label>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Description <span className="font-normal text-[#94A3B8]">(optional)</span></span>
            <input name="description" className="tg-input" />
          </label>
          <button type="submit" className="tg-button-primary text-sm">Add Skill</button>
        </form>
      </div>

      <div className="space-y-3">
        {skills.length === 0 ? (
          <div className="tg-card px-5 py-10 text-center text-sm text-[#64748B]">No skills yet — add one above.</div>
        ) : (
          skills.map((skill) => (
            <div key={skill.id} className="tg-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 bg-[#F8FAFC] px-5 py-3.5">
                <div>
                  <p className="font-bold text-[#0F172A]">{skill.name}</p>
                  {skill.description && <p className="text-xs text-[#64748B]">{skill.description}</p>}
                </div>
                <form action={deleteSkill}>
                  <input type="hidden" name="id" value={skill.id} />
                  <button type="submit" className="text-xs text-rose-500 hover:underline">Delete</button>
                </form>
              </div>
              <div className="p-5 space-y-3">
                {skill.subSkills.length === 0 ? (
                  <p className="text-sm text-[#94A3B8]">No sub-skills yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skill.subSkills.map((sub) => (
                      <form key={sub.id} action={deleteSubSkill} className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white pl-3 pr-1.5 py-1">
                        <input type="hidden" name="id" value={sub.id} />
                        <span className="text-xs text-[#334155]">{sub.name}</span>
                        <button type="submit" aria-label={`Remove ${sub.name}`} className="rounded-full px-1.5 text-xs text-rose-500 hover:bg-rose-50">×</button>
                      </form>
                    ))}
                  </div>
                )}
                <form action={createSubSkill} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                  <input type="hidden" name="skillId" value={skill.id} />
                  <label className="text-sm text-[#334155]">
                    <span className="mb-1 block font-medium">Add sub-skill</span>
                    <input name="name" required placeholder="e.g. REST API design" className="tg-input" />
                  </label>
                  <label className="text-sm text-[#334155]">
                    <span className="mb-1 block font-medium">Description <span className="font-normal text-[#94A3B8]">(optional)</span></span>
                    <input name="description" className="tg-input" />
                  </label>
                  <button type="submit" className="tg-button-primary text-sm">Add</button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

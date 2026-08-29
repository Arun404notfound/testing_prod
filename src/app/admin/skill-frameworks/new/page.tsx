import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { FormCard } from "@/components/ui/form-card";
import { TextField } from "@/components/ui/text-field";
import { importSkillFrameworkFromWorkbook } from "@/lib/skillFrameworkImport";
import { CreateSkillFrameworkButton, ImportSkillFrameworkButton } from "./submit-buttons";

async function createSkillFrameworkManual(formData: FormData) {
  "use server";
  const tenantId = await getDefaultTenantId();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) redirect("/admin/skill-frameworks/new?status=error");

  let created;
  try {
    created = await prisma.skillFramework.create({ data: { tenantId, name, slug, description } });
  } catch {
    redirect("/admin/skill-frameworks/new?status=error");
  }
  revalidatePath("/admin/skill-frameworks");
  redirect(`/admin/skill-frameworks/${created.id}/builder?tab=mapping`);
}

async function importSkillFrameworkWorkbookAction(formData: FormData) {
  "use server";
  const tenantId = await getDefaultTenantId();
  const skillFrameworkName = String(formData.get("skillFrameworkName") ?? "").trim();
  const file = formData.get("file");
  if (!skillFrameworkName || !(file instanceof File)) {
    redirect("/admin/skill-frameworks/new?status=import-error");
  }

  let redirectTarget: string;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await importSkillFrameworkFromWorkbook({ tenantId, skillFrameworkName, bytes });
    const warn = result.warnings.length > 0 ? "import-warn" : "import-success";
    redirectTarget = `/admin/skill-frameworks/${result.skillFrameworkId}/builder?tab=mapping&status=${warn}&domains=${result.domainCount}&comps=${result.competencyCount}&maps=${result.mappingCount}`;
  } catch {
    redirectTarget = "/admin/skill-frameworks/new?status=import-error";
  }

  revalidatePath("/admin/skill-frameworks");
  redirect(redirectTarget);
}

export default async function NewSkillFrameworkPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="New Skill Framework"
        subtitle="Set up a Skill Framework, then map its Domain → Competency → Sub-Skill framework in the builder."
        right={
          <Link href="/admin/skill-frameworks" className="text-sm font-medium text-[#0F766E] hover:underline">
            Back to list
          </Link>
        }
      />

      {status === "error" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Could not create the Skill Framework. Check the name and try again.
        </div>
      ) : null}
      {status === "import-error" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Import failed. Make sure the file matches the template (a &quot;Skill framework&quot; sheet
          and a &quot;Report Content&quot; sheet) and try again.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <FormCard title="Manual setup">
          <p className="mb-4 text-sm text-[#64748B]">
            Create the Skill Framework now, then map its Domain → Competency → Sub-Skill framework and
            fill in its Report Section content step by step in the builder.
          </p>
          <form action={createSkillFrameworkManual} className="grid gap-4">
            <TextField name="name" label="Name" />
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Slug <span className="font-normal text-[#94A3B8]">(optional)</span></span>
              <input name="slug" placeholder="e.g. software-engineer-l2" className="tg-input w-full" />
            </label>
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Description <span className="font-normal text-[#94A3B8]">(optional)</span></span>
              <textarea name="description" rows={3} className="tg-input w-full" />
            </label>
            <CreateSkillFrameworkButton />
          </form>
        </FormCard>

        <FormCard title="Import setup">
          <p className="mb-4 text-sm text-[#64748B]">
            Upload a workbook with a &quot;Skill framework&quot; sheet (Domain, Skill, Definition, Key
            Behaviours, Sub-Skill Mapping) and a &quot;Report Content&quot; sheet (band descriptions,
            strength/development-need statements, on-the-job projects). Each Sub-Skill Mapping bullet is
            written as <code>Parent Skill: Sub-skill name</code> (e.g. &quot;Backend Engineering: REST API
            design&quot;) — the parent Skill and Sub-Skill are created automatically if they don&apos;t
            already exist. Auto-populates the whole framework and report content in one go.
          </p>
          <a
            href="/api/skill-frameworks/template"
            className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#EFF6FF] transition"
          >
            Download Excel template
          </a>
          <form action={importSkillFrameworkWorkbookAction} className="grid gap-4">
            <TextField name="skillFrameworkName" label="Skill Framework name" />
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Workbook (.xlsx)</span>
              <input name="file" type="file" accept=".xlsx" required className="tg-input w-full" />
            </label>
            <ImportSkillFrameworkButton />
          </form>
        </FormCard>
      </div>
    </main>
  );
}

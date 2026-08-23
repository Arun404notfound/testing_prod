import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { FormCard } from "@/components/ui/form-card";
import { TextField } from "@/components/ui/text-field";
import { CreateSkillFrameworkButton } from "./submit-buttons";

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

      <div className="max-w-xl">
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
      </div>
    </main>
  );
}

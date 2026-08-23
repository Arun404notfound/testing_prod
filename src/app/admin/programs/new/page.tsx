import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { FormCard } from "@/components/ui/form-card";
import { TextField } from "@/components/ui/text-field";
import type { ProgramCompositionType } from "@/generated/prisma/enums";

const COMPOSITION_TYPES: ProgramCompositionType[] = ["PSYCHOMETRIC", "TECHNICAL", "SURVEY", "MIXED"];

async function createProgram(formData: FormData) {
  "use server";
  const tenantId = await getDefaultTenantId();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const compositionType = String(formData.get("compositionType") ?? "") as ProgramCompositionType;

  if (!title) redirect("/admin/programs/new?status=error");
  if (!COMPOSITION_TYPES.includes(compositionType)) redirect("/admin/programs/new?status=error");

  let created;
  try {
    created = await prisma.program.create({ data: { tenantId, title, description, compositionType } });
  } catch {
    redirect("/admin/programs/new?status=error");
  }
  revalidatePath("/admin/programs");
  redirect(`/admin/programs/${created.id}/builder`);
}

export default async function NewProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="New Program"
        subtitle="Pick one of the three individual modules for a single-module Program, or Mixed to combine several modules into one candidate-facing test."
        right={
          <Link href="/admin/programs" className="text-sm font-medium text-[#0F766E] hover:underline">
            Back to list
          </Link>
        }
      />

      {status === "error" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Could not create the Program. Check the name and try again.
        </div>
      ) : null}

      <div className="max-w-xl">
        <FormCard title="Program details">
          <form action={createProgram} className="grid gap-4">
            <TextField name="title" label="Title" />
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Description <span className="font-normal text-[#94A3B8]">(optional)</span></span>
              <textarea name="description" rows={3} className="tg-input w-full" />
            </label>
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Composition</span>
              <select name="compositionType" required defaultValue="PSYCHOMETRIC" className="tg-input w-full">
                <option value="PSYCHOMETRIC">Psychometric — single Psychometric module</option>
                <option value="TECHNICAL">Technical — single Technical module</option>
                <option value="SURVEY">Survey — single Survey module</option>
                <option value="MIXED">Mixed — combine multiple modules</option>
              </select>
            </label>
            <button type="submit" className="tg-button-primary w-fit">Create and open builder</button>
          </form>
        </FormCard>
      </div>
    </main>
  );
}

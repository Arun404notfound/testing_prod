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

const COMPOSITION_OPTIONS: Array<{ value: ProgramCompositionType; label: string; description: string }> = [
  { value: "PSYCHOMETRIC", label: "Psychometric", description: "Single Psychometric module" },
  { value: "TECHNICAL", label: "Technical", description: "Single Technical module" },
  { value: "SURVEY", label: "Survey", description: "Single Survey module" },
  { value: "MIXED", label: "Mixed", description: "Combine multiple modules" },
];

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

      <div className="max-w-4xl">
        <FormCard title="Program details">
          <form action={createProgram} className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
            <div className="grid content-start gap-4">
              <TextField name="title" label="Title" />
              <label className="flex h-full flex-col text-sm text-[#334155]">
                <span className="mb-1 block font-medium">Description <span className="font-normal text-[#94A3B8]">(optional)</span></span>
                <textarea name="description" rows={5} className="tg-input w-full flex-1 resize-none" />
              </label>
            </div>
            <fieldset className="text-sm text-[#334155]">
              <legend className="mb-1 block font-medium">Composition</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {COMPOSITION_OPTIONS.map((option, index) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 rounded-[10px] border-[1.5px] border-[#C4CFDD] bg-[#FAFBFD] px-3.5 py-2.5 transition-colors has-checked:border-[#2563EB] has-checked:bg-[#EFF6FF]"
                  >
                    <input
                      type="radio"
                      name="compositionType"
                      value={option.value}
                      required
                      defaultChecked={index === 0}
                      className="h-4 w-4 shrink-0 accent-[#2563EB]"
                    />
                    <span>
                      <span className="block font-medium text-[#0f172a]">{option.label}</span>
                      <span className="block text-xs text-[#64748B]">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" className="tg-button-primary w-fit lg:col-span-2">Create and open builder</button>
          </form>
        </FormCard>
      </div>
    </main>
  );
}

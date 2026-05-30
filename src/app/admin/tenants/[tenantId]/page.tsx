import Link from "next/link";
import { notFound } from "next/navigation";
import { TenantBrandingFields } from "@/components/admin/tenant-branding-fields";
import { prisma } from "@/lib/prisma";
import { updateTenant } from "../actions";

export default async function EditTenantPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { tenantId } = await params;
  const { saved, error } = await searchParams;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) notFound();

  const boundUpdate = updateTenant.bind(null, tenant.id);

  return (
    <main className="tg-page mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0F172A]">Edit tenant</h1>
        <Link href="/admin/tenants" className="text-sm font-medium text-[#1D4ED8] hover:underline">
          All tenants
        </Link>
      </div>

      {saved ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Saved.</div>
      ) : null}
      {error === "slug" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Slug conflict — choose another slug.</div>
      ) : null}
      {error === "missing" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Name and slug are required.</div>
      ) : null}
      {error === "logo" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Logo upload failed. Use a PNG, JPG, JPEG, or WebP under 2&nbsp;MB, or paste a valid URL instead.
        </div>
      ) : null}

      <section className="tg-card p-6">
        <p className="text-sm text-[#64748B]">
          Assessments and candidates linked to this tenant use this branding in reports and on the candidate test screen.
        </p>
        <form action={boundUpdate} className="mt-4 grid gap-5">
          <div className="grid gap-4 sm:max-w-md">
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Name</span>
              <input name="name" required className="tg-input w-full" defaultValue={tenant.name} />
            </label>
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Slug</span>
              <input name="slug" required className="tg-input w-full" defaultValue={tenant.slug} />
            </label>
          </div>
          <TenantBrandingFields
            initialPrimary={tenant.primaryColor}
            initialSecondary={tenant.secondaryColor}
            initialAccent={tenant.accentColor}
            initialLogoUrl={tenant.logoUrl}
          />
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Disclaimer (reports)</span>
            <textarea
              name="disclaimerText"
              rows={5}
              className="tg-input w-full font-sans"
              defaultValue={tenant.disclaimerText ?? ""}
              placeholder="Leave blank for default disclaimer text."
            />
          </label>
          <button type="submit" className="tg-button-primary w-fit text-sm">
            Save changes
          </button>
        </form>
      </section>
    </main>
  );
}

import Link from "next/link";
import { TenantBrandingFields } from "@/components/admin/tenant-branding-fields";
import { prisma } from "@/lib/prisma";
import { createTenant } from "./actions";

export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const tenants = await prisma.tenant.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="tg-page space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Tenants & branding</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Client logos and colors apply to assessment experience and generated reports. The admin portal keeps TechGrah styling.
          </p>
        </div>
        <Link href="/admin/dashboard" className="text-sm font-medium text-[#1D4ED8] hover:underline">
          Back to dashboard
        </Link>
      </div>

      {error === "slug" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Could not save: slug may already be in use. Choose a unique slug.
        </div>
      ) : null}
      {error === "missing" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Name and slug are required.
        </div>
      ) : null}
      {error === "logo" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Logo upload failed. Use a PNG, JPG, JPEG, or WebP under 2&nbsp;MB, or paste a valid URL instead.
        </div>
      ) : null}

      <section className="tg-card overflow-hidden p-0">
        <div className="border-b border-[#E2E8F0] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#0F172A]">All tenants</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#64748B]">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Slug</th>
                <th className="px-5 py-3 font-medium">Colors</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-t border-[#E2E8F0]">
                  <td className="px-5 py-3 font-medium text-[#0F172A]">{t.name}</td>
                  <td className="px-5 py-3 text-[#64748B]">{t.slug}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <span className="h-4 w-4 rounded border border-slate-200" style={{ backgroundColor: t.primaryColor ?? "#e5e7eb" }} title="Primary" />
                      <span className="h-4 w-4 rounded border border-slate-200" style={{ backgroundColor: t.secondaryColor ?? "#e5e7eb" }} title="Secondary" />
                      <span className="h-4 w-4 rounded border border-slate-200" style={{ backgroundColor: t.accentColor ?? "#e5e7eb" }} title="Accent" />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/admin/tenants/${t.id}`} className="font-medium text-[#1D4ED8] hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tenants.length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">No tenants yet.</p> : null}
      </section>

      <section className="tg-card p-6">
        <h2 className="text-lg font-semibold text-[#0F172A]">Create tenant</h2>
        <p className="mt-1 text-sm text-[#64748B]">
          Slug must be unique (lowercase letters, numbers, hyphens). Branding below applies to reports and the candidate
          test experience.
        </p>
        <form action={createTenant} className="mt-4 grid max-w-2xl gap-5">
          <div className="grid gap-4 sm:max-w-md">
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Name</span>
              <input name="name" required className="tg-input w-full" placeholder="Acme Corp" />
            </label>
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Slug</span>
              <input name="slug" required className="tg-input w-full" placeholder="acme-corp" />
            </label>
          </div>
          <TenantBrandingFields />
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Disclaimer (report footer)</span>
            <textarea name="disclaimerText" rows={4} className="tg-input w-full font-sans" placeholder="Optional custom disclaimer for PDF reports" />
          </label>
          <button type="submit" className="tg-button-primary w-fit text-sm">
            Create tenant
          </button>
        </form>
      </section>
    </main>
  );
}

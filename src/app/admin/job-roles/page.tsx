import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { BackToDashboard } from "@/components/ui/back-to-dashboard";
import { getDefaultTenantId } from "@/lib/tenant";

export default async function JobRolesPage() {
  const tenantId = await getDefaultTenantId();

  const jobRoles = await prisma.jobRole.findMany({
    where: { tenantId },
    orderBy: { displayOrder: "asc" },
    include: {
      domains: { select: { id: true } },
      competencies: { select: { id: true, attributeMaps: { select: { id: true } } } },
    },
  });

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="Job Roles"
        subtitle="Each Job Role owns its own Domain → Competency → Attribute framework and report content. Assessments select a Job Role instead of a raw report style."
        right={
          <div className="flex items-center gap-3">
            <BackToDashboard />
            <Link href="/admin/job-roles/new" className="tg-button-primary text-sm">
              New Job Role
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        {jobRoles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-12 text-center text-sm text-[#64748B]">
            No job roles yet.{" "}
            <Link href="/admin/job-roles/new" className="font-medium text-[#0F766E] hover:underline">
              Create one →
            </Link>
          </div>
        ) : (
          jobRoles.map((role) => {
            const domainCount = role.domains.length;
            const competencyCount = role.competencies.length;
            const mappingCount = role.competencies.reduce((sum, c) => sum + c.attributeMaps.length, 0);

            return (
              <div key={role.id} className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between border-b border-[#F1F5F9]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-[#0F172A]">{role.name}</p>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          role.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-500"
                        }`}
                      >
                        {role.isActive ? "active" : "inactive"}
                      </span>
                    </div>
                    {role.description && (
                      <p className="mt-1.5 max-w-2xl text-sm text-[#64748B]">{role.description}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Link
                      href={`/admin/job-roles/${role.id}/builder`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#EFF6FF] transition"
                    >
                      Open →
                    </Link>
                  </div>
                </div>

                <div className="px-5 py-3">
                  <div className="flex flex-wrap items-baseline gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Domains</p>
                      <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{domainCount}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Competencies</p>
                      <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{competencyCount}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Attribute mappings</p>
                      <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{mappingCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

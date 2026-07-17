import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { FormCard } from "@/components/ui/form-card";
import { AutoDismissToast } from "@/components/ui/auto-dismiss-toast";
import {
  updateJobRoleDetails,
  createDomain,
  updateDomain,
  deleteDomain,
  reorderDomain,
  createCompetency,
  updateCompetency,
  deleteCompetency,
  reorderCompetency,
  createMapping,
  deleteMapping,
  bulkUpdateWeights,
  updateBandContent,
  upsertProject,
  deleteProject,
} from "./actions";
import { JobRoleBuilderHeaderActions } from "./header-actions";
import { MappingSection } from "./mapping-section";
import { ReportSection } from "./report-section";

export type BuilderSearch = {
  tab?: string;
  status?: string;
  openDomain?: string;
  openComp?: string;
  editDomainId?: string;
  editCompId?: string;
  comp?: string;
  domains?: string;
  comps?: string;
  maps?: string;
};

const STATUS_MESSAGES: Record<string, { message: string; variant: "success" | "error" }> = {
  success: { message: "Saved successfully.", variant: "success" },
  error: { message: "Something went wrong. Check your input and try again.", variant: "error" },
};

export default async function JobRoleBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobRoleId: string }>;
  searchParams: Promise<BuilderSearch>;
}) {
  const { jobRoleId } = await params;
  const sp = await searchParams;
  const tab = sp.tab === "content" ? "content" : "mapping";
  const tenantId = await getDefaultTenantId();

  const jobRole = await prisma.jobRole.findFirst({ where: { id: jobRoleId } });
  if (!jobRole) notFound();

  const [domains, competencies, attributes] = await Promise.all([
    prisma.domain.findMany({ where: { jobRoleId }, orderBy: { displayOrder: "asc" } }),
    prisma.competency.findMany({
      where: { jobRoleId },
      orderBy: { displayOrder: "asc" },
      include: {
        attributeMaps: { include: { attribute: true } },
        bandContents: true,
        developmentProjects: { orderBy: { displayOrder: "asc" } },
      },
    }),
    prisma.attribute.findMany({ where: { tenantId }, orderBy: { code: "asc" } }),
  ]);

  const mappingCount = competencies.reduce((sum, c) => sum + c.attributeMaps.length, 0);

  const boundUpdateDetails = updateJobRoleDetails.bind(null, jobRoleId);

  const toast = sp.status && (STATUS_MESSAGES[sp.status] ?? (sp.status.startsWith("import") ? {
    message: sp.status === "import-warn"
      ? `Imported ${sp.domains ?? "0"} domains, ${sp.comps ?? "0"} competencies, ${sp.maps ?? "0"} mappings — with warnings, check the server log.`
      : `Imported ${sp.domains ?? "0"} domains, ${sp.comps ?? "0"} competencies, ${sp.maps ?? "0"} attribute mappings.`,
    variant: sp.status === "import-warn" ? "error" as const : "success" as const,
  } : null));

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title={jobRole.name}
        subtitle={jobRole.description ?? "Map its Domain → Competency → Attribute framework, then fill in its Report Section content."}
        right={
          <div className="flex items-center gap-3">
            <Link href="/admin/job-roles" className="text-sm font-medium text-[#0F766E] hover:underline">
              Back to list
            </Link>
            <JobRoleBuilderHeaderActions jobRoleId={jobRoleId} jobRoleName={jobRole.name} />
          </div>
        }
      />

      {toast ? <AutoDismissToast message={toast.message} variant={toast.variant} /> : null}

      <FormCard title="Job role details">
        <form action={boundUpdateDetails} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Name *</span>
            <input name="name" required defaultValue={jobRole.name} className="tg-input" />
          </label>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Slug <span className="font-normal text-[#94A3B8]">(optional)</span></span>
            <input name="slug" defaultValue={jobRole.slug ?? ""} className="tg-input" />
          </label>
          <label className="text-sm text-[#334155] md:col-span-2">
            <span className="mb-1 block font-medium">Description <span className="font-normal text-[#94A3B8]">(optional)</span></span>
            <textarea name="description" rows={2} defaultValue={jobRole.description ?? ""} className="tg-input w-full" />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#334155]">
            <input type="checkbox" name="isActive" defaultChecked={jobRole.isActive} className="rounded border-slate-300" />
            Active — selectable when creating assessments
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="tg-button-primary text-sm">Save details</button>
          </div>
        </form>
      </FormCard>

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0]">
        <nav className="-mb-px flex flex-wrap gap-6">
          <Link
            href={`/admin/job-roles/${jobRoleId}/builder?tab=mapping`}
            className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
              tab === "mapping" ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#64748B] hover:text-[#334155]"
            }`}
          >
            Mapping ({domains.length} domains · {competencies.length} competencies · {mappingCount} attrs)
          </Link>
          <Link
            href={`/admin/job-roles/${jobRoleId}/builder?tab=content`}
            className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
              tab === "content" ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#64748B] hover:text-[#334155]"
            }`}
          >
            Report Section
          </Link>
        </nav>
      </div>

      {tab === "mapping" ? (
        <MappingSection
          jobRoleId={jobRoleId}
          domains={domains}
          competencies={competencies}
          attributes={attributes}
          sp={sp}
          createDomain={createDomain.bind(null, jobRoleId)}
          updateDomain={updateDomain.bind(null, jobRoleId)}
          deleteDomain={deleteDomain.bind(null, jobRoleId)}
          reorderDomain={reorderDomain.bind(null, jobRoleId)}
          createCompetency={createCompetency.bind(null, jobRoleId)}
          updateCompetency={updateCompetency.bind(null, jobRoleId)}
          deleteCompetency={deleteCompetency.bind(null, jobRoleId)}
          reorderCompetency={reorderCompetency.bind(null, jobRoleId)}
          createMapping={createMapping.bind(null, jobRoleId)}
          deleteMapping={deleteMapping.bind(null, jobRoleId)}
          bulkUpdateWeights={bulkUpdateWeights.bind(null, jobRoleId)}
        />
      ) : (
        <ReportSection
          jobRoleId={jobRoleId}
          competencies={competencies}
          sp={sp}
          updateCompetency={updateCompetency.bind(null, jobRoleId)}
          updateBandContent={updateBandContent.bind(null, jobRoleId)}
          upsertProject={upsertProject.bind(null, jobRoleId)}
          deleteProject={deleteProject.bind(null, jobRoleId)}
        />
      )}
    </main>
  );
}

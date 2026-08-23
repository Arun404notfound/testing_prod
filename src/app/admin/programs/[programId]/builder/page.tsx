import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { FormCard } from "@/components/ui/form-card";
import { AutoDismissToast } from "@/components/ui/auto-dismiss-toast";
import type { ModuleType } from "@/generated/prisma/enums";
import {
  assignProgramToBatch,
  assignProgramToCandidate,
  attachExistingAssessment,
  createAndAttachModule,
  detachAssessment,
  reorderAssessment,
  updateProgramDetails,
} from "./actions";
import { ProgramBuilderHeaderActions } from "./header-actions";
import { ProgramAssignmentForm } from "./program-assignment-form";

const MODULE_LABELS: Record<string, string> = {
  PSYCHOMETRIC: "Psychometric",
  TECHNICAL: "Technical",
  SURVEY: "Survey",
};

const STATUS_MESSAGES: Record<string, { variant: "success" | "error"; message: string }> = {
  success: { variant: "success", message: "Saved successfully." },
  error: { variant: "error", message: "Something went wrong." },
  assign_success: { variant: "success", message: "Program assigned. The candidate has been emailed one link to start the first module." },
  assign_success_email_failed: { variant: "error", message: "Program assigned, but the notification email could not be sent. Check the Brevo configuration." },
};

export default async function ProgramBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ status?: string; reason?: string; count?: string; total?: string; emailFailures?: string }>;
}) {
  const { programId } = await params;
  const sp = await searchParams;
  const tenantId = await getDefaultTenantId();

  const program = await prisma.program.findFirst({
    where: { id: programId },
    include: {
      assessments: {
        orderBy: { displayOrder: "asc" },
        include: { assessment: { select: { id: true, title: true, moduleType: true, lifecycleStatus: true } } },
      },
    },
  });
  if (!program) notFound();

  const isMixed = program.compositionType === "MIXED";
  const allowedModuleTypes: ModuleType[] = isMixed
    ? ["PSYCHOMETRIC", "TECHNICAL", "SURVEY"]
    : [program.compositionType as ModuleType];
  const atCap = !isMixed && program.assessments.length >= 1;

  const attachedAssessmentIds = program.assessments.map((pa) => pa.assessment.id);
  const candidateAssessments = atCap
    ? []
    : await prisma.assessment.findMany({
        where: {
          tenantId,
          moduleType: { in: allowedModuleTypes },
          id: { notIn: attachedAssessmentIds },
        },
        orderBy: { title: "asc" },
        select: { id: true, title: true, moduleType: true, lifecycleStatus: true },
      });

  const toast = sp.status ? STATUS_MESSAGES[sp.status] : null;
  const toastMessage = sp.status === "error" && sp.reason ? sp.reason : toast?.message ?? "Something went wrong.";

  const boundUpdateDetails = updateProgramDetails.bind(null, programId);
  const boundAttach = attachExistingAssessment.bind(null, programId);
  const boundCreateModule = createAndAttachModule.bind(null, programId);
  const boundDetach = detachAssessment.bind(null, programId);
  const boundReorder = reorderAssessment.bind(null, programId);
  const boundAssignProgram = assignProgramToCandidate.bind(null, programId);
  const boundAssignBatch = assignProgramToBatch.bind(null, programId);

  const allPublished = program.assessments.length > 0 && program.assessments.every((pa) => pa.assessment.lifecycleStatus === "published");
  const [candidates, batchRows] = allPublished
    ? await Promise.all([
        prisma.candidate.findMany({ where: { tenantId }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
        prisma.candidate.findMany({ where: { tenantId }, select: { batchName: true }, orderBy: { batchName: "asc" } }),
      ])
    : [[], []];
  const batches = [...new Set(batchRows.map((b) => b.batchName).filter((b): b is string => Boolean(b)))];

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title={program.title}
        subtitle={`${program.compositionType} Program · ${program.assessments.length} module${program.assessments.length === 1 ? "" : "s"} attached`}
        right={
          <div className="flex items-center gap-3">
            <Link href="/admin/programs" className="text-sm font-medium text-[#0F766E] hover:underline">
              Back to list
            </Link>
            <ProgramBuilderHeaderActions programId={programId} programTitle={program.title} moduleCount={program.assessments.length} />
          </div>
        }
      />

      {sp.status === "assign_bulk_success" && (
        <AutoDismissToast
          variant={Number(sp.emailFailures) > 0 ? "error" : undefined}
          message={
            `Bulk assigned: ${sp.count} new candidate${Number(sp.count) !== 1 ? "s" : ""} started on this Program (${sp.total} in the selected batch(es), duplicates skipped).` +
            (Number(sp.emailFailures) > 0 ? ` ${sp.emailFailures} notification email${Number(sp.emailFailures) !== 1 ? "s" : ""} failed to send.` : "")
          }
        />
      )}
      {toast ? <AutoDismissToast message={toastMessage} variant={toast.variant} /> : null}

      <FormCard title="Program details">
        <form action={boundUpdateDetails} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Title *</span>
            <input name="title" required defaultValue={program.title} className="tg-input" />
          </label>
          <label className="text-sm text-[#334155] md:col-span-2">
            <span className="mb-1 block font-medium">Description <span className="font-normal text-[#94A3B8]">(optional)</span></span>
            <textarea name="description" rows={2} defaultValue={program.description ?? ""} className="tg-input w-full" />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="tg-button-primary text-sm">Save details</button>
          </div>
        </form>
      </FormCard>

      <FormCard title={`Modules (${program.assessments.length})`}>
        {program.assessments.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">No modules attached yet — attach one below.</p>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {program.assessments.map((pa, i) => (
              <div key={pa.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#2563EB]">{pa.assessment.moduleType}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#0F172A]">{pa.assessment.title}</p>
                    <p className="text-xs text-[#94A3B8]">{pa.assessment.lifecycleStatus}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {isMixed && (
                    <div className="flex items-center gap-1">
                      <form action={boundReorder}>
                        <input type="hidden" name="id" value={pa.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button type="submit" disabled={i === 0} className="rounded px-1 text-xs text-[#64748B] hover:bg-slate-100 disabled:opacity-30">▲</button>
                      </form>
                      <form action={boundReorder}>
                        <input type="hidden" name="id" value={pa.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button type="submit" disabled={i === program.assessments.length - 1} className="rounded px-1 text-xs text-[#64748B] hover:bg-slate-100 disabled:opacity-30">▼</button>
                      </form>
                    </div>
                  )}
                  <Link href={`/admin/assessments/${pa.assessment.id}/builder`} className="text-xs font-medium text-[#0F766E] hover:underline">
                    Edit content →
                  </Link>
                  <form action={boundDetach}>
                    <input type="hidden" name="id" value={pa.id} />
                    <button type="submit" className="text-xs text-rose-500 hover:underline">Detach</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </FormCard>

      {atCap ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          This {program.compositionType} Program already has its one module. Switch to Mixed to combine more than one module.
        </div>
      ) : (
        <FormCard title="Add a module">
          <div className="space-y-4">
            {isMixed ? (
              <form action={boundCreateModule} className="flex flex-wrap items-end gap-4">
                <label className="min-w-[220px] text-sm text-[#334155]">
                  <span className="mb-1 block font-medium">Module</span>
                  <select name="moduleType" defaultValue={allowedModuleTypes[0]} className="tg-input w-full">
                    {allowedModuleTypes.map((mt) => (
                      <option key={mt} value={mt}>{MODULE_LABELS[mt]} Module</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="tg-button-primary text-sm">Add Module</button>
              </form>
            ) : (
              <form action={boundCreateModule}>
                <input type="hidden" name="moduleType" value={allowedModuleTypes[0]} />
                <button type="submit" className="tg-button-primary text-sm">
                  + Add {MODULE_LABELS[allowedModuleTypes[0]]} Module
                </button>
              </form>
            )}
            <p className="text-xs text-[#94A3B8]">
              Creates the module and takes you straight to its builder to add questions.
            </p>

            {candidateAssessments.length > 0 && (
              <details className="border-t border-[#F1F5F9] pt-4">
                <summary className="cursor-pointer text-xs font-medium text-[#0F766E] hover:underline">
                  Attach an existing unattached module instead
                </summary>
                <form action={boundAttach} className="mt-3 flex flex-wrap items-end gap-4">
                  <label className="min-w-[280px] flex-1 text-sm text-[#334155]">
                    <span className="mb-1 block font-medium">Existing assessment</span>
                    <select name="assessmentId" defaultValue="" required className="tg-input w-full">
                      <option value="" disabled>Select an assessment…</option>
                      {candidateAssessments.map((a) => (
                        <option key={a.id} value={a.id}>[{a.moduleType}] {a.title} ({a.lifecycleStatus})</option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="tg-button-primary text-sm">Attach</button>
                </form>
              </details>
            )}
          </div>
        </FormCard>
      )}

      <FormCard id="assign-candidate" title="Assign to a candidate">
        {!allPublished ? (
          <p className="text-sm text-[#94A3B8]">
            {program.assessments.length === 0
              ? "Attach at least one module first."
              : "Every attached module must be published before this Program can be assigned."}
          </p>
        ) : (
          <ProgramAssignmentForm
            candidates={candidates}
            batches={batches}
            assignProgramToCandidate={boundAssignProgram}
            assignProgramToBatch={boundAssignBatch}
          />
        )}
        <p className="mt-3 text-xs text-[#94A3B8]">
          Sends one link per candidate that walks them through every module in order, with a transition screen between each.
        </p>
      </FormCard>
    </main>
  );
}

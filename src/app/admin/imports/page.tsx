import Link from "next/link";
import { BackToDashboard } from "@/components/ui/back-to-dashboard";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { processImportFile, type ImportKind } from "@/lib/imports";
import { getTemplateColumns } from "@/lib/import-templates";
import { PageHeader } from "@/components/ui/page-header";
import { FormCard } from "@/components/ui/form-card";
import { TableCard } from "@/components/ui/table-card";

async function runImport(formData: FormData) {
  "use server";

  const importType = String(formData.get("importType") ?? "") as ImportKind;
  const file = formData.get("file");
  if (!importType || !(file instanceof File)) {
    redirect("/admin/imports?status=error");
  }

  const rawBatch = String(formData.get("batchName") ?? "").trim();
  const batchName = importType === "CANDIDATES"
    ? rawBatch || `Import ${new Date().toISOString().slice(0, 19).replace("T", " ")}`
    : null;

  const tenantId = await getDefaultTenantId();
  const fileName = file.name || "upload";
  const bytes = new Uint8Array(await file.arrayBuffer());

  const job = await prisma.importJob.create({
    data: {
      tenantId,
      importType,
      fileName,
      batchName,
      status: "PROCESSING",
    },
    select: { id: true },
  });

  try {
    const result = await processImportFile({
      tenantId,
      importType,
      fileName,
      bytes,
      batchName,
    });

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: result.failedRows > 0 ? "FAILED" : "COMPLETED",
        totalRows: result.totalRows,
        successRows: result.successRows,
        failedRows: result.failedRows,
        rowErrors: {
          create: result.errors.map((error) => ({
            rowNumber: error.rowNumber,
            message: error.message,
          })),
        },
      },
    });
  } catch {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        totalRows: 0,
        successRows: 0,
        failedRows: 1,
        rowErrors: {
          create: [{ rowNumber: 0, message: "Import processing failed." }],
        },
      },
    });
  }

  revalidatePath("/admin/imports");
  redirect(`/admin/imports?jobId=${job.id}`);
}

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; jobId?: string }>;
}) {
  const { status, jobId } = await searchParams;
  const tenantId = await getDefaultTenantId();
  const templateColumns = getTemplateColumns();

  const [latestJobs, batchRows] = await Promise.all([
    prisma.importJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.candidate.findMany({
      where: { tenantId },
      select: { batchName: true },
      orderBy: { batchName: "asc" },
    }),
  ]);

  const existingBatches = [...new Set(batchRows.map((b) => b.batchName).filter((b): b is string => Boolean(b)))];

  const selectedJob = jobId
    ? await prisma.importJob.findFirst({
        where: { id: jobId, tenantId },
        include: { rowErrors: { orderBy: { rowNumber: "asc" } } },
      })
    : null;

  const latestImportedTriadGroups = await prisma.triadGroup.findMany({
    where: {
      tenantId,
      triadGroupCode: { not: null },
      assessment: { title: "Imported Triad Bank" },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { _count: { select: { statements: true } } },
  });

  return (
    <main className="tg-page space-y-6">
      <div className="space-y-6">
        <PageHeader
          title="Imports"
          subtitle="Upload CSV/XLSX files for candidates and items."
          right={
            <BackToDashboard />
          }
        />

        {status === "error" ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Please select an import type and file.
          </div>
        ) : null}

        <FormCard title="Upload File">
          <form action={runImport} className="space-y-4">
            <label className="block text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Upload Type</span>
              <select name="importType" className="tg-input" defaultValue="CANDIDATES" required>
                <option value="CANDIDATES">Candidates</option>
                <option value="MCQ_QUESTIONS">MCQ Questions</option>
                <option value="LIKERT_ITEMS">Likert Items</option>
                <option value="TRIAD_ITEMS">Triad Items</option>
              </select>
            </label>

            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
              <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide">Batch (Candidates only)</p>
              <p className="text-xs text-[#64748B]">
                Tag this import with a batch name to bulk-assign an assessment to all candidates in it later. Type a new name or pick an existing one.
              </p>
              <label className="block text-sm text-[#334155]">
                <span className="mb-1 block font-medium">Batch name</span>
                <input
                  name="batchName"
                  list="existing-batches"
                  className="tg-input w-full"
                  placeholder="e.g. Q2 Sales Cohort, June Leadership Batch…"
                  autoComplete="off"
                />
                {existingBatches.length > 0 && (
                  <datalist id="existing-batches">
                    {existingBatches.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                )}
              </label>
            </div>

            <label className="block text-sm text-[#334155]">
              <span className="mb-1 block font-medium">File (.csv or .xlsx)</span>
              <input name="file" type="file" className="tg-input" accept=".csv,.xlsx" required />
            </label>

            <button type="submit" className="tg-button-primary">
              Start Import
            </button>
          </form>
        </FormCard>

        <FormCard title="Sample CSV Templates">
          <div className="grid gap-2 md:grid-cols-2">
            <a
              href="/api/imports/templates?type=CANDIDATES"
              className="tg-button-primary inline-flex items-center justify-center"
            >
              Download Candidates Template
            </a>
            <a
              href="/api/imports/templates?type=MCQ_QUESTIONS"
              className="tg-button-primary inline-flex items-center justify-center"
            >
              Download MCQ Template
            </a>
            <a
              href="/api/imports/templates?type=LIKERT_ITEMS"
              className="tg-button-primary inline-flex items-center justify-center"
            >
              Download Likert Template
            </a>
            <a
              href="/api/imports/templates?type=TRIAD_ITEMS"
              className="tg-button-primary inline-flex items-center justify-center"
            >
              Download Triad Template
            </a>
          </div>
          <p className="mt-3 text-sm text-[#64748B]">
            Templates include headers and sample rows. Triad template includes two complete groups (6 data rows).
          </p>
        </FormCard>

        <TableCard title="Expected Columns">
          <div className="space-y-4 text-sm text-[#334155]">
            <div>
              <p className="font-semibold text-[#0F172A]">Candidates</p>
              <p>{templateColumns.candidates.join(", ")}</p>
            </div>
            <div>
              <p className="font-semibold text-[#0F172A]">MCQ Questions</p>
              <p>{templateColumns.mcq.join(", ")}</p>
            </div>
            <div>
              <p className="font-semibold text-[#0F172A]">Likert Items</p>
              <p>{templateColumns.likert.join(", ")}</p>
            </div>
            <div>
              <p className="font-semibold text-[#0F172A]">Triad Items</p>
              <p>{templateColumns.triad.join(", ")}</p>
            </div>
          </div>
        </TableCard>

        <TableCard title="Latest Imported Triad Groups">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Group Code</th>
                <th className="px-3 py-2">Statement Count</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {latestImportedTriadGroups.map((group) => (
                <tr key={group.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{group.triadGroupCode}</td>
                  <td className="px-3 py-2">{group._count.statements}</td>
                  <td className="px-3 py-2">{new Date(group.createdAt).toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {latestImportedTriadGroups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-slate-500">
                    No triad groups imported yet (or none under Imported Triad Bank).
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Recent Import Jobs">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Batch</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Success</th>
                <th className="px-3 py-2">Failed</th>
                <th className="px-3 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {latestJobs.map((job) => (
                <tr key={job.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{new Date(job.createdAt).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2">{job.importType}</td>
                  <td className="px-3 py-2">{job.fileName}</td>
                  <td className="px-3 py-2">
                    {job.batchName ? (
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{job.batchName}</span>
                    ) : <span className="text-[#94A3B8]">—</span>}
                  </td>
                  <td className="px-3 py-2">{job.status}</td>
                  <td className="px-3 py-2">{job.totalRows}</td>
                  <td className="px-3 py-2">{job.successRows}</td>
                  <td className="px-3 py-2">{job.failedRows}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/imports?jobId=${job.id}`} className="text-[#0F766E] hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {latestJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-4 text-slate-500">
                    No imports yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableCard>

        {selectedJob ? (
          <TableCard title={`Import Result - ${selectedJob.fileName}`}>
            <div className="mb-4 grid gap-2 text-sm md:grid-cols-4">
              <p>Total Rows: {selectedJob.totalRows}</p>
              <p>Successful Rows: {selectedJob.successRows}</p>
              <p>Failed Rows: {selectedJob.failedRows}</p>
              <p>Status: {selectedJob.status}</p>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {selectedJob.rowErrors.map((error) => (
                  <tr key={error.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{error.rowNumber}</td>
                    <td className="px-3 py-2">{error.message}</td>
                  </tr>
                ))}
                {selectedJob.rowErrors.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-slate-500">
                      No row errors.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </TableCard>
        ) : null}
      </div>
    </main>
  );
}

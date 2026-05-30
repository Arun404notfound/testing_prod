import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TableCard } from "@/components/ui/table-card";
import { PageHeader } from "@/components/ui/page-header";
export default async function AssessmentsPage() {
  const assessments = await prisma.assessment.findMany({
    include: {
      questions: true,
      compositionItems: true,
      tenant: { select: { id: true, name: true, logoUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="tg-page space-y-6">
      <div className="space-y-6">
        <PageHeader
          title="Assessments"
          subtitle="Create assessments, add items in the builder, then publish before assigning."
          right={
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className="text-sm font-medium text-[#1D4ED8] hover:underline">
                Back to dashboard
              </Link>
              <Link href="/admin/assessments/new" className="tg-button-primary text-sm">
                New assessment
              </Link>
            </div>
          }
        />

        <TableCard title="All assessments">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((assessment) => {
                const itemCount =
                  assessment.questions.length + assessment.compositionItems.length;
                return (
                  <tr key={assessment.id} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-medium text-[#0F172A]">{assessment.title}</td>
                    <td className="px-3 py-2 text-slate-600">
                      <div className="flex items-center gap-2">
                        {assessment.tenant?.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={assessment.tenant.logoUrl}
                            alt=""
                            className="h-7 w-7 shrink-0 rounded border border-slate-200 bg-white object-contain p-0.5"
                          />
                        ) : null}
                        <span className="min-w-0 truncate">{assessment.tenant?.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{assessment.assessmentType}</td>
                    <td className="px-3 py-2 capitalize">{assessment.lifecycleStatus}</td>
                    <td className="px-3 py-2">{assessment.durationMinutes} min</td>
                    <td className="px-3 py-2">
                      {assessment.questions.length} MCQ
                      {assessment.compositionItems.length > 0
                        ? ` + ${assessment.compositionItems.length} pool`
                        : ""}{" "}
                      <span className="text-slate-400">({itemCount} total)</span>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/assessments/${assessment.id}/builder`}
                        className="font-medium text-[#1D4ED8] hover:underline"
                      >
                        Builder
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {assessments.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={7}>
                    No assessments yet. Create one to get started.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableCard>
      </div>
    </main>
  );
}

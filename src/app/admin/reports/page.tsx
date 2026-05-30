import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";

export default async function ReportsIndexPage() {
  const tenantId = await getDefaultTenantId();
  const results = await prisma.assessmentResult.findMany({
    where: {
      candidate: { tenantId },
    },
    include: {
      candidate: true,
      assessment: true,
    },
    orderBy: { completedAt: "desc" },
  });

  return (
    <main className="tg-page space-y-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0F172A]">Assessment Reports</h1>
          <Link href="/admin/dashboard" className="text-sm font-medium text-[#1D4ED8] hover:underline">
            Back to dashboard
          </Link>
        </div>

        <section className="tg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Completed Results</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Candidate</th>
                  <th className="px-3 py-2">Assessment</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{result.candidate.fullName}</td>
                    <td className="px-3 py-2">
                      {result.assessment?.title ?? result.assessmentName}
                    </td>
                    <td className="px-3 py-2">{result.overallScore}%</td>
                    <td className="px-3 py-2">
                      {new Date(result.completedAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/reports/${result.id}`}
                        className="text-sm font-medium text-[#1D4ED8] hover:underline"
                      >
                        Open Report
                      </Link>
                    </td>
                  </tr>
                ))}
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-slate-500">
                      No completed results yet. Complete a test from candidate view.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

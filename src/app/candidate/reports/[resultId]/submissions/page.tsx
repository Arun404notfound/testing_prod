import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubmissions } from "@/lib/get-submissions";
import { SubmissionsView } from "@/components/submissions/submissions-view";
import { canAccessReport } from "@/lib/auth/report-access";

export default async function CandidateSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ resultId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { resultId } = await params;
  const { token } = await searchParams;
  if (!(await canAccessReport(resultId, { session: null, token }))) notFound();

  const data = await getSubmissions(resultId);
  if (!data) notFound();

  const { result } = data;

  return (
    <main className="tg-page space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/candidate/reports/${resultId}?token=${token}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#2563EB] px-3 py-1.5 text-sm font-semibold text-[#2563EB] hover:bg-teal-50 transition">
            ← View Report
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">My Submissions</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {result.assessment?.title ?? result.assessmentName} ·{" "}
            {new Date(result.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      <SubmissionsView data={data} />
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubmissions } from "@/lib/get-submissions";
import { SubmissionsView } from "@/components/submissions/submissions-view";

export default async function CandidateSubmissionsPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const { resultId } = await params;
  const data = await getSubmissions(resultId);
  if (!data) notFound();

  const { result } = data;

  return (
    <main className="tg-page space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">My Submissions</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {result.assessment?.title ?? result.assessmentName} ·{" "}
            {new Date(result.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/candidate" className="inline-flex items-center gap-1 text-sm font-medium text-[#1D4ED8] hover:underline">
            ← My Assessments
          </Link>
          <Link href={`/candidate/reports/${resultId}`} className="text-sm font-medium text-[#1D4ED8] hover:underline">
            View Report
          </Link>
        </div>
      </div>

      <SubmissionsView data={data} />
    </main>
  );
}

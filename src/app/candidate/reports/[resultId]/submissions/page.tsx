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
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/candidate" className="inline-flex items-center gap-1 text-sm font-medium text-[#0F766E] hover:underline">
            ← My Assessments
          </Link>
          <span className="text-[#CBD5E1]">·</span>
          <Link href={`/candidate/reports/${resultId}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#0F766E] px-3 py-1.5 text-sm font-semibold text-[#0F766E] hover:bg-teal-50 transition">
            View Report →
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

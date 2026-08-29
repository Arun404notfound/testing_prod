"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, FileWarning, FileX2 } from "lucide-react";
import type { ProgramReportPayload } from "@/lib/program-report-data";
import { normalizeProgramReportPayload } from "@/lib/normalize-program-report-payload";
import { formatReportCompletedDate } from "@/lib/report-date";
import { pdfFileName } from "@/lib/pdf-filename";
import { reportTheme } from "@/components/reports/report-theme";
import { ProgramReportDocument } from "@/components/reports/ProgramReportDocument";

/** Mirrors report-by-id-client.tsx one level up — one combined document per
 *  Program instead of per module. Same loading/error states, same PDF flow. */
export default function ProgramReportByIdClient() {
  const { programResultId } = useParams<{ programResultId: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const isCandidate = pathname.startsWith("/candidate/program-reports");
  const backHref = "/admin/reports";
  const backLabel = "Back to reports";

  const hasId = Boolean(programResultId);
  const [program, setProgram] = useState<ProgramReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!hasId) return;
    (async () => {
      const url = token
        ? `/api/program-reports/${programResultId}?token=${encodeURIComponent(token)}`
        : `/api/program-reports/${programResultId}`;
      const response = await fetch(url);
      if (response.ok) {
        const normalized = normalizeProgramReportPayload(await response.json());
        if (normalized) setProgram(normalized);
      }
      setLoading(false);
    })();
  }, [hasId, programResultId, token]);

  const completedDate = useMemo(() => (program ? formatReportCompletedDate(program.completedAt) : "-"), [program]);

  async function downloadPdf() {
    if (!program) return;
    setDownloading(true);
    try {
      const url = token
        ? `/api/program-reports/${programResultId}/pdf?token=${encodeURIComponent(token)}`
        : `/api/program-reports/${programResultId}/pdf`;
      const response = await fetch(url);
      if (!response.ok) return;
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = pdfFileName(program.programTitle);
      link.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <main
        className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: reportTheme.pageBackground }}
      >
        <Loader2 size={28} className="animate-spin text-[#2563EB]" />
        <p className="text-sm font-medium text-[#64748B]">Loading report…</p>
      </main>
    );
  }

  if (!hasId || !program) {
    const Icon = hasId ? FileX2 : FileWarning;
    return (
      <main
        className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 p-6"
        style={{ backgroundColor: reportTheme.pageBackground }}
      >
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-8 py-10 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
            <Icon size={22} className="text-rose-500" />
          </div>
          <p className="text-base font-semibold text-[#0F172A]">
            {hasId ? "Report not found" : "Report id missing"}
          </p>
          <p className="text-sm text-[#64748B]">
            {hasId
              ? "This report may have been removed, or the link is no longer valid."
              : "No report id was provided in the URL."}
          </p>
          {!isCandidate && (
            <Link
              href={backHref}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#2563EB] px-4 py-2 text-sm font-medium text-[#2563EB] transition hover:bg-[#EFF6FF]"
            >
              <ArrowLeft size={14} />
              {backLabel}
            </Link>
          )}
        </div>
      </main>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ backgroundColor: reportTheme.pageBackground }}>
      <div className="shrink-0 border-b border-[#E2E8F0] bg-white px-4 py-4 shadow-sm md:px-10">
        <div className="mx-auto max-w-6xl space-y-3">
          {!isCandidate && (
            <Link
              href={backHref}
              className="group inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 -mx-2 text-sm font-medium text-[#2563EB] transition hover:bg-[#EFF6FF]"
            >
              <ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
              {backLabel}
            </Link>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#0F172A]">Program Report Preview</h1>
              <p className="mt-0.5 truncate text-sm text-[#64748B]">
                {[program.candidateName, program.programTitle].filter(Boolean).join(" · ")}
                {" · "}
                {program.modules.length} module{program.modules.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={downloadPdf}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {downloading ? "Generating…" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-10 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="space-y-10 overflow-x-auto [&_.report-page]:overflow-hidden [&_.report-page]:rounded-xl [&_.report-page]:shadow-[0_20px_45px_-18px_rgba(15,23,42,0.35)] [&_.report-page]:ring-1 [&_.report-page]:ring-black/5">
            <ProgramReportDocument program={program} completedDate={completedDate} />
          </div>
        </div>
      </div>
    </div>
  );
}

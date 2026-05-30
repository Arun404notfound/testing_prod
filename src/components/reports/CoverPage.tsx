"use client";

import type { ReportPayload } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

function Info({ label, value, mutedColor }: { label: string; value: string; mutedColor: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: mutedColor }}>
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

type CoverVariant = "mcq" | "psychometric" | "triad" | "hybrid";

const subtitle: Record<CoverVariant, string> = {
  mcq: "Skill Assessment Report",
  psychometric: "Psychometric Assessment Report",
  triad: "Forced-Choice Assessment Report",
  hybrid: "Hybrid Assessment Report",
};

export function CoverPage({
  report,
  completedDate,
  variant,
}: {
  report: ReportPayload;
  completedDate: string;
  variant: CoverVariant;
}) {
  const { theme, logoUrl } = useReportTheme();
  const clientLabel = report.tenantName ?? "Demo Client";
  return (
    <section
      className="rounded-md border p-6"
      style={{ borderColor: theme.border, backgroundColor: theme.subtleBackground }}
    >
      {logoUrl ? (
        <div className="mb-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            className="max-h-16 max-w-[200px] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      ) : null}
      <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.muted }}>
        {subtitle[variant]}
      </p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight">{report.assessmentName}</h2>
      <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
        <Info label="Candidate Name" value={report.candidateName} mutedColor={theme.muted} />
        <Info label="Role" value={report.candidateRole || "—"} mutedColor={theme.muted} />
        <Info label="Client / Tenant" value={clientLabel} mutedColor={theme.muted} />
        <Info label="Assessment Date" value={completedDate} mutedColor={theme.muted} />
      </div>
    </section>
  );
}

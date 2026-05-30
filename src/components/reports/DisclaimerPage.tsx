"use client";

import { useReportTheme } from "./report-theme-context";

export function DisclaimerPage() {
  const { theme, disclaimerText } = useReportTheme();
  return (
    <section className="rounded-md border p-6" style={{ borderColor: theme.border, backgroundColor: theme.subtleBackground }}>
      <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>
        Disclaimer & Copyright
      </h3>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: theme.secondary }}>
        {disclaimerText}
      </p>
    </section>
  );
}

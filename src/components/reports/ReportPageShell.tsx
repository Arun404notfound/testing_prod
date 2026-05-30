"use client";

import type { CSSProperties, ReactNode } from "react";
import { useReportTheme } from "./report-theme-context";

export function ReportPageShell({ children }: { children: ReactNode }) {
  const { theme } = useReportTheme();
  const style: CSSProperties = {
    backgroundColor: theme.cardBackground,
    color: theme.primary,
    borderColor: theme.border,
    width: "210mm",
    minHeight: "297mm",
  };
  return (
    <div className="report-page mx-auto rounded-md border px-10 py-10 shadow-sm" style={style}>
      {children}
    </div>
  );
}

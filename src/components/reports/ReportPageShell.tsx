"use client";

import type { CSSProperties, ReactNode } from "react";
import { useReportTheme } from "./report-theme-context";

export function ReportPageShell({ children }: { children: ReactNode }) {
  const { theme } = useReportTheme();
  const style: CSSProperties = {
    backgroundColor: theme.cardBackground,
    color: theme.primary,
    borderColor: theme.border,
    minHeight: "297mm",
  };
  return (
    <div className="report-page mx-auto w-full rounded-md border px-2 py-4 shadow-sm sm:px-10 sm:py-10 sm:w-[210mm]" style={style}>
      {children}
    </div>
  );
}

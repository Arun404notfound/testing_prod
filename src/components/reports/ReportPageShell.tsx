"use client";

import type { CSSProperties, ReactNode } from "react";
import { useReportTheme } from "./report-theme-context";

type Props = {
  children: ReactNode;
  /** Running header label, top-left (e.g. report/section name). Omit to render the page exactly as before. */
  pageLabel?: string;
  /** Running footer line, bottom-left (e.g. "Candidate · Tenant · Date"). */
  footerMeta?: string;
  /** 1-indexed page number, shown top-right and bottom-right alongside `totalPages`. */
  pageNumber?: number;
  totalPages?: number;
  /** Suppress the small running-header logo — for pages (e.g. the cover) that already feature a large logo of their own. */
  hideHeaderLogo?: boolean;
  /** Vertically center children within the page body — for cover-style pages. */
  centerContent?: boolean;
};

export function ReportPageShell({ children, pageLabel, footerMeta, pageNumber, totalPages, hideHeaderLogo, centerContent }: Props) {
  const { theme, logoUrl } = useReportTheme();
  const style: CSSProperties = {
    backgroundColor: theme.cardBackground,
    color: theme.ink,
    minHeight: "297mm",
  };
  const hasRunningHeader = Boolean(pageLabel || pageNumber);
  const hasRunningFooter = Boolean(footerMeta || pageNumber);

  return (
    <div
      className="report-page mx-auto flex w-[210mm] flex-col"
      style={style}
    >
      {hasRunningHeader && (
        <div
          className="flex shrink-0 items-center justify-between border-b px-10 pt-7 pb-4"
          style={{ borderColor: theme.hairline }}
        >
          <div className="flex items-center gap-3">
            {logoUrl && !hideHeaderLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-8 max-w-[140px] object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            {pageLabel && (
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 shrink-0" style={{ backgroundColor: theme.accent }} />
                <span className="text-sm font-medium" style={{ color: theme.ink }}>
                  {pageLabel}
                </span>
              </div>
            )}
          </div>
          {pageNumber && (
            <span className="text-xs font-semibold" style={{ color: theme.body }}>
              Page {pageNumber}
              {totalPages ? ` of ${totalPages}` : ""}
            </span>
          )}
        </div>
      )}

      <div className={`flex flex-1 flex-col px-10 py-10 ${centerContent ? "justify-center" : ""}`}>{children}</div>

      {hasRunningFooter && (
        <div
          className="flex shrink-0 items-baseline justify-between border-t px-10 pt-4 pb-7 text-xs"
          style={{ borderColor: theme.hairline, color: theme.body }}
        >
          <span>{footerMeta}</span>
          {pageNumber && <span>{pageNumber}{totalPages ? ` / ${totalPages}` : ""}</span>}
        </div>
      )}
    </div>
  );
}

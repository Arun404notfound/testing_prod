"use client";

import type { CSSProperties, ReactNode } from "react";
import { useReportTheme } from "./report-theme-context";
import { AutoFitPageBody } from "./AutoFitPageBody";
import { reportTypography } from "./report-typography";

type Props = {
  children: ReactNode;
  /** Running footer line, bottom-left (e.g. "Candidate · Tenant · Date"). */
  footerMeta?: string;
  /** 1-indexed page number, shown bottom-right alongside `totalPages`. */
  pageNumber?: number;
  totalPages?: number;
  /** Vertically center children within the page body — for cover-style pages. */
  centerContent?: boolean;
  /**
   * Guarantee children fit on this one physical page by shrinking them if
   * needed, regardless of how long the underlying content is. Reserved for
   * pages meant to be exactly one page each (per-competency detail cards) —
   * pages that are allowed to legitimately run long (score overview lists,
   * trait tables) should leave this off.
   */
  autoFit?: boolean;
};

// No running header bar — matching the reference design, each page's own
// content (via SectionHeading) starts right at the top margin instead of
// sitting under a logo/page-label chrome bar. Only the footer is "running"
// (repeated) chrome now.
export function ReportPageShell({ children, footerMeta, pageNumber, totalPages, centerContent, autoFit }: Props) {
  const { theme } = useReportTheme();
  const style: CSSProperties = {
    backgroundColor: theme.cardBackground,
    color: theme.ink,
    minHeight: "297mm",
    fontFamily: theme.fontFamily,
  };
  const hasRunningFooter = Boolean(footerMeta || pageNumber);

  return (
    <div
      className="report-page mx-auto flex w-[210mm] flex-col"
      style={style}
    >
      <div className={`report-page-body flex flex-1 flex-col px-10 py-10 ${centerContent ? "justify-center" : ""}`}>
        {autoFit ? <AutoFitPageBody>{children}</AutoFitPageBody> : children}
      </div>

      {hasRunningFooter && (
        <div
          className="report-page-footer flex shrink-0 items-baseline justify-between border-t px-10 pt-4 pb-7"
          style={{ ...reportTypography.bodyXSmall, borderColor: theme.hairline, color: theme.body, backgroundColor: theme.cardBackground }}
        >
          <span>{footerMeta}</span>
          {pageNumber && <span>{pageNumber}{totalPages ? ` / ${totalPages}` : ""}</span>}
        </div>
      )}
    </div>
  );
}

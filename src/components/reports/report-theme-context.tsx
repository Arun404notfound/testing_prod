"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { type ReportThemePalette } from "./report-theme";
import {
  mergeReportTheme,
  resolveDisclaimerText,
  resolveLogoUrl,
  tenantRowToBranding,
  type ReportTenantBranding,
} from "@/lib/report-branding";

export type ReportThemeContextValue = {
  theme: ReportThemePalette;
  disclaimerText: string;
  logoUrl: string | null;
};

const defaultBranding = tenantRowToBranding(null);

const ReportThemeContext = createContext<ReportThemeContextValue>({
  theme: mergeReportTheme(defaultBranding),
  disclaimerText: resolveDisclaimerText(defaultBranding),
  logoUrl: null,
});

export function ReportThemeProvider({
  branding,
  children,
}: {
  branding?: ReportTenantBranding | null;
  children: ReactNode;
}) {
  const value = useMemo<ReportThemeContextValue>(() => {
    const b = branding ?? defaultBranding;
    return {
      theme: mergeReportTheme(b),
      disclaimerText: resolveDisclaimerText(b),
      logoUrl: resolveLogoUrl(b),
    };
  }, [branding]);
  return <ReportThemeContext.Provider value={value}>{children}</ReportThemeContext.Provider>;
}

export function useReportTheme() {
  return useContext(ReportThemeContext);
}

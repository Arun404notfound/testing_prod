"use client";

import { useMemo, useState } from "react";

export type AssessmentTenantOption = { id: string; name: string; logoUrl: string | null };

export function AssessmentTenantSelect({
  tenants,
  initialTenantId,
}: {
  tenants: AssessmentTenantOption[];
  initialTenantId: string | null;
}) {
  const [value, setValue] = useState(initialTenantId ?? "");
  const selected = useMemo(() => tenants.find((t) => t.id === value), [tenants, value]);

  return (
    <div className="space-y-2">
      <label className="text-sm text-[#334155]">
        <span className="mb-1 block font-medium">Tenant (branding)</span>
        <select
          name="assessmentTenantId"
          className="tg-input w-full max-w-lg"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="">None — reports use candidate tenant, then platform defaults</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
          Logo and colors from this tenant apply to generated reports and the candidate test header. Leave empty to rely on
          the candidate&apos;s tenant instead.
        </p>
      </label>
      <div className="flex min-h-[3rem] items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
        {selected?.logoUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.logoUrl} alt="" className="h-9 max-w-[140px] object-contain" />
            <span className="text-sm font-medium text-[#0F172A]">{selected.name}</span>
          </>
        ) : selected ? (
          <span className="text-sm font-medium text-[#0F172A]">{selected.name}</span>
        ) : (
          <span className="text-sm text-[#64748B]">No tenant selected — preview will use fallbacks above.</span>
        )}
      </div>
    </div>
  );
}

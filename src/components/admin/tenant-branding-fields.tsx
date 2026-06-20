"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TENANT_BRANDING_FORM_DEFAULTS,
  normalizeTenantHex,
} from "@/lib/tenant-branding-form";

type Role = "primary" | "secondary" | "accent";

function pickInitial(v: string | null | undefined, role: Role): string {
  return normalizeTenantHex(v) ?? TENANT_BRANDING_FORM_DEFAULTS[role];
}

function ColorField({
  label,
  hiddenName,
  value,
  text,
  setText,
  onPick,
  onBlurText,
}: {
  label: string;
  hiddenName: string;
  value: string;
  text: string;
  setText: (s: string) => void;
  onPick: (hex: string) => void;
  onBlurText: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[#334155]">{label}</span>
        <span
          className="h-8 w-10 shrink-0 rounded-md border border-[#E2E8F0] shadow-inner"
          style={{ backgroundColor: value }}
          aria-hidden
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={value}
          onChange={(e) => {
            const h = e.target.value;
            onPick(h);
            setText(h);
          }}
          className="h-10 w-14 shrink-0 cursor-pointer rounded border border-[#E2E8F0] bg-white p-0.5"
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={onBlurText}
          spellCheck={false}
          className="tg-input min-w-0 flex-1 font-mono text-sm"
          placeholder="#RRGGBB"
          aria-label={`${label} hex`}
        />
      </div>
      <input type="hidden" name={hiddenName} value={value} readOnly />
    </div>
  );
}

export function TenantBrandingFields({
  initialPrimary = null,
  initialSecondary = null,
  initialAccent = null,
  initialLogoUrl = null,
}: {
  initialPrimary?: string | null;
  initialSecondary?: string | null;
  initialAccent?: string | null;
  initialLogoUrl?: string | null;
}) {
  const [primary, setPrimary] = useState(() => pickInitial(initialPrimary, "primary"));
  const [primaryText, setPrimaryText] = useState(() => pickInitial(initialPrimary, "primary"));
  const [secondary, setSecondary] = useState(() => pickInitial(initialSecondary, "secondary"));
  const [secondaryText, setSecondaryText] = useState(() => pickInitial(initialSecondary, "secondary"));
  const [accent, setAccent] = useState(() => pickInitial(initialAccent, "accent"));
  const [accentText, setAccentText] = useState(() => pickInitial(initialAccent, "accent"));

  const [logoPreview, setLogoPreview] = useState<string | null>(() => initialLogoUrl?.trim() || null);
  const blobUrlRef = useRef<string | null>(null);

  const revokeBlob = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const onLogoFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    revokeBlob();
    if (!f) {
      setLogoPreview(initialLogoUrl?.trim() || null);
      return;
    }
    const url = URL.createObjectURL(f);
    blobUrlRef.current = url;
    setLogoPreview(url);
  }, [initialLogoUrl, revokeBlob]);

  useEffect(() => () => revokeBlob(), [revokeBlob]);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-gradient-to-b from-[#F8FAFC] to-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold tracking-tight text-[#0F172A]">Brand appearance</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
        These colors will be used in reports and candidate test screens.
      </p>

      <div className="mt-4 flex gap-2" aria-hidden>
        {[primary, secondary, accent].map((c, i) => (
          <div
            key={i}
            className="h-11 min-w-0 flex-1 rounded-lg border border-[#E2E8F0] shadow-inner"
            style={{ backgroundColor: c }}
            title="Color preview"
          />
        ))}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <ColorField
          label="Primary"
          hiddenName="primaryColor"
          value={primary}
          text={primaryText}
          setText={setPrimaryText}
          onPick={setPrimary}
          onBlurText={() => {
            const n = normalizeTenantHex(primaryText.trim());
            if (n) {
              setPrimary(n);
              setPrimaryText(n);
            } else setPrimaryText(primary);
          }}
        />
        <ColorField
          label="Secondary"
          hiddenName="secondaryColor"
          value={secondary}
          text={secondaryText}
          setText={setSecondaryText}
          onPick={setSecondary}
          onBlurText={() => {
            const n = normalizeTenantHex(secondaryText.trim());
            if (n) {
              setSecondary(n);
              setSecondaryText(n);
            } else setSecondaryText(secondary);
          }}
        />
        <ColorField
          label="Accent"
          hiddenName="accentColor"
          value={accent}
          text={accentText}
          setText={setAccentText}
          onPick={setAccent}
          onBlurText={() => {
            const n = normalizeTenantHex(accentText.trim());
            if (n) {
              setAccent(n);
              setAccentText(n);
            } else setAccentText(accent);
          }}
        />
      </div>

      <div className="mt-6 space-y-4 border-t border-[#E2E8F0] pt-5">
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A]">Logo</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
            Use a URL, or upload a PNG, JPG, or WebP file (stored under{" "}
            <code className="rounded bg-[#F1F5F9] px-1 py-0.5 text-[11px]">/uploads/tenants/</code>
            ). Uploading replaces the URL below when you save.
          </p>
        </div>

        {logoPreview ? (
          <div className="flex justify-center rounded-lg border border-[#E2E8F0] bg-white px-4 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoPreview}
              alt="Logo preview"
              className="max-h-20 max-w-[240px] object-contain"
              onError={() => {
                if (!logoPreview.startsWith("blob:")) setLogoPreview(null);
              }}
            />
          </div>
        ) : (
          <p className="text-xs italic text-[#94A3B8]">No logo preview yet.</p>
        )}

        <label className="block text-sm text-[#334155]">
          <span className="mb-1 block font-medium">Logo URL (optional)</span>
          <input
            name="logoUrl"
            type="text"
            className="tg-input w-full"
            placeholder="https://… or /uploads/tenants/…"
            defaultValue={initialLogoUrl ?? ""}
          />
        </label>

        <div className="text-sm text-[#334155]">
          <span className="mb-1 block font-medium">Upload logo</span>
          <input
            type="file"
            name="logoFile"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            onChange={onLogoFileChange}
            className="block w-full cursor-pointer text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0F766E] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-[#0D9488]"
          />
        </div>
      </div>
    </div>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveTenantFormColor } from "@/lib/tenant-branding-form";
import { saveTenantLogoFile } from "@/lib/tenant-logo-upload";

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function resolveLogoFromForm(
  formData: FormData
): Promise<{ ok: true; logoUrl: string | null } | { ok: false }> {
  const textUrl = String(formData.get("logoUrl") ?? "").trim() || null;
  const file = formData.get("logoFile");
  if (file instanceof File && file.size > 0) {
    const result = await saveTenantLogoFile(file);
    if (!result.ok) return { ok: false };
    return { ok: true, logoUrl: result.publicPath };
  }
  return { ok: true, logoUrl: textUrl };
}

export async function createTenant(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  if (!name || !slug) {
    redirect("/admin/tenants?error=missing");
  }

  const logoResolved = await resolveLogoFromForm(formData);
  if (!logoResolved.ok) {
    redirect("/admin/tenants?error=logo");
  }
  const logoUrl = logoResolved.logoUrl;
  const disclaimerText = String(formData.get("disclaimerText") ?? "").trim() || null;

  let tenant;
  try {
    tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        logoUrl,
        primaryColor: resolveTenantFormColor(formData.get("primaryColor"), "primary"),
        secondaryColor: resolveTenantFormColor(formData.get("secondaryColor"), "secondary"),
        accentColor: resolveTenantFormColor(formData.get("accentColor"), "accent"),
        disclaimerText,
      },
    });
  } catch {
    redirect("/admin/tenants?error=slug");
  }
  revalidatePath("/admin/tenants");
  redirect(`/admin/tenants/${tenant.id}`);
}

export async function updateTenant(tenantId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  if (!name || !slug) {
    redirect(`/admin/tenants/${tenantId}?error=missing`);
  }

  const logoResolved = await resolveLogoFromForm(formData);
  if (!logoResolved.ok) {
    redirect(`/admin/tenants/${tenantId}?error=logo`);
  }
  const logoUrl = logoResolved.logoUrl;
  const disclaimerText = String(formData.get("disclaimerText") ?? "").trim() || null;

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name,
        slug,
        logoUrl,
        primaryColor: resolveTenantFormColor(formData.get("primaryColor"), "primary"),
        secondaryColor: resolveTenantFormColor(formData.get("secondaryColor"), "secondary"),
        accentColor: resolveTenantFormColor(formData.get("accentColor"), "accent"),
        disclaimerText,
      },
    });
  } catch {
    redirect(`/admin/tenants/${tenantId}?error=slug`);
  }
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${tenantId}`);
  redirect(`/admin/tenants/${tenantId}?saved=1`);
}

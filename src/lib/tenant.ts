import { prisma } from "@/lib/prisma";

const DEFAULT_TENANT = {
  name: "TechGrah Demo Client",
  slug: "techgrah-demo",
  logoUrl: null as string | null,
  primaryColor: "#1f2937",
  secondaryColor: "#4b5563",
  accentColor: "#1d4ed8",
  disclaimerText: null as string | null,
};

export async function getDefaultTenantId() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT.slug },
    update: {},
    create: DEFAULT_TENANT,
    select: { id: true },
  });

  return tenant.id;
}

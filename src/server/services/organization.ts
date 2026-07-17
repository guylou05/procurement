import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getCountry } from "@/config/countries";

/**
 * Creates an organization for a user and makes them its OWNER. Tenant-creating
 * operation (pre-membership), so it is not scoped by an existing TenantContext.
 */
export async function createOrganization(
  userId: string,
  input: {
    name: string;
    country: string;
    currency: string;
    defaultLocale: string;
    timezone?: string;
    industry?: string;
    phone?: string;
    address?: string;
  },
): Promise<{ id: string }> {
  const country = getCountry(input.country);
  const baseSlug = slugify(input.name) || "org";

  // Ensure slug uniqueness.
  let slug = baseSlug;
  for (let i = 1; await prisma.organization.findUnique({ where: { slug } }); i++) {
    slug = `${baseSlug}-${i}`;
  }

  const org = await prisma.organization.create({
    data: {
      name: input.name.trim(),
      slug,
      country: input.country,
      currency: input.currency,
      defaultLocale: input.defaultLocale,
      timezone: input.timezone ?? country?.timezone ?? "Africa/Douala",
      industry: input.industry,
      phone: input.phone,
      address: input.address,
      settings: { create: {} },
      members: { create: { userId, role: "OWNER" } },
    },
  });

  return { id: org.id };
}

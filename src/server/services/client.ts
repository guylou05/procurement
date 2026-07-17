import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";

export async function listClients(ctx: TenantContext) {
  return prisma.client.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function createClient(
  ctx: TenantContext,
  input: { name: string; company?: string; email?: string; phone?: string; whatsapp?: string },
) {
  return prisma.client.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name.trim(),
      company: input.company,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
    },
  });
}

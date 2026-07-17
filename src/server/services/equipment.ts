import type { EquipmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { toMinor } from "@/lib/money";

/** Equipment & asset service — tenant-scoped. */

export async function listEquipment(ctx: TenantContext) {
  return prisma.equipment.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function getEquipment(ctx: TenantContext, id: string) {
  return prisma.equipment.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      assignments: { orderBy: { checkedOutAt: "desc" }, take: 20, include: { project: { select: { name: true } } } },
      maintenance: { orderBy: { performedAt: "desc" }, take: 20 },
    },
  });
}

export async function createEquipment(
  ctx: TenantContext,
  input: {
    name: string;
    assetId: string;
    category?: string;
    serialNumber?: string;
    purchaseCost?: number;
    location?: string;
    condition?: string;
    nextMaintenanceAt?: Date;
  },
) {
  const currency = ctx.organization.currency;
  return prisma.equipment.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name.trim(),
      assetId: input.assetId.trim(),
      category: input.category,
      serialNumber: input.serialNumber,
      currency,
      purchaseCostMinor: input.purchaseCost ? toMinor(input.purchaseCost, currency) : 0,
      location: input.location,
      condition: input.condition,
      nextMaintenanceAt: input.nextMaintenanceAt,
      status: "AVAILABLE",
    },
  });
}

export async function setEquipmentStatus(
  ctx: TenantContext,
  id: string,
  status: EquipmentStatus,
) {
  const result = await prisma.equipment.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: { status },
  });
  if (result.count === 0) throw new Error("Equipment not found in organization");
}

/** Equipment due for maintenance within `days`, for dashboard/alerts. */
export async function maintenanceDueCount(ctx: TenantContext, days = 14) {
  const horizon = new Date(Date.now() + days * 864e5);
  return prisma.equipment.count({
    where: {
      organizationId: ctx.organizationId,
      deletedAt: null,
      nextMaintenanceAt: { not: null, lte: horizon },
    },
  });
}

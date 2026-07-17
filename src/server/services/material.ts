import type { MaterialTxnType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { toMinor } from "@/lib/money";

/** Materials & inventory service — tenant-scoped, with stock-moving transactions. */

/** Transaction types that increase on-hand quantity; the rest decrease it. */
const INCREASING: MaterialTxnType[] = ["PURCHASE", "RECEIVE", "RETURN"];

export async function listMaterials(ctx: TenantContext) {
  return prisma.material.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    include: { category: true },
    orderBy: { name: "asc" },
  });
}

export function isLowStock(material: { quantity: number; minQuantity: number }): boolean {
  return material.minQuantity > 0 && material.quantity <= material.minQuantity;
}

export async function createMaterial(
  ctx: TenantContext,
  input: {
    name: string;
    sku?: string;
    unit: string;
    supplier?: string;
    unitCost?: number;
    quantity?: number;
    minQuantity?: number;
    location?: string;
  },
) {
  const currency = ctx.organization.currency;
  return prisma.material.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name.trim(),
      sku: input.sku,
      unit: input.unit,
      supplier: input.supplier,
      currency,
      unitCostMinor: input.unitCost ? toMinor(input.unitCost, currency) : 0,
      quantity: input.quantity ?? 0,
      minQuantity: input.minQuantity ?? 0,
      location: input.location,
    },
  });
}

/**
 * Records a stock transaction and atomically adjusts on-hand quantity. Scoped to the
 * tenant: the material must belong to the caller's organization.
 */
export async function recordTransaction(
  ctx: TenantContext,
  input: {
    materialId: string;
    type: MaterialTxnType;
    quantity: number;
    projectId?: string;
    reason?: string;
  },
) {
  const material = await prisma.material.findFirst({
    where: { id: input.materialId, organizationId: ctx.organizationId },
    select: { id: true, unit: true },
  });
  if (!material) throw new Error("Material not found in organization");

  const delta = INCREASING.includes(input.type)
    ? Math.abs(input.quantity)
    : -Math.abs(input.quantity);

  return prisma.$transaction([
    prisma.materialTransaction.create({
      data: {
        organizationId: ctx.organizationId,
        materialId: input.materialId,
        projectId: input.projectId || null,
        type: input.type,
        quantity: input.quantity,
        unit: material.unit,
        reason: input.reason,
        userId: ctx.userId,
      },
    }),
    prisma.material.update({
      where: { id: input.materialId },
      data: { quantity: { increment: delta } },
    }),
  ]);
}

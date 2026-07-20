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
/** True if a transaction type increases on-hand quantity. */
export function isIncreasing(type: MaterialTxnType): boolean {
  return INCREASING.includes(type);
}

/**
 * Material hub: the material plus its transaction ledger with a running balance, total
 * stock value, and a usage-by-project summary. The running balance is anchored to the
 * authoritative current quantity and computed backward, so it stays correct even when
 * initial stock was set at creation without a transaction. Tenant-scoped.
 */
export async function getMaterialHub(ctx: TenantContext, id: string) {
  const material = await prisma.material.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: { category: true },
  });
  if (!material) return null;

  const txns = await prisma.materialTransaction.findMany({
    where: { materialId: id, organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });

  // Annotate each txn (newest→oldest) with balanceAfter, walking back from current qty.
  let running = material.quantity;
  const ledger = txns.map((tx) => {
    const delta = isIncreasing(tx.type) ? Math.abs(tx.quantity) : -Math.abs(tx.quantity);
    const balanceAfter = running;
    running -= delta;
    return { ...tx, delta, balanceAfter };
  });

  const usageByProject = new Map<string, { name: string; qty: number }>();
  for (const tx of txns) {
    if (isIncreasing(tx.type) || !tx.project) continue;
    const cur = usageByProject.get(tx.project.id) ?? { name: tx.project.name, qty: 0 };
    cur.qty += Math.abs(tx.quantity);
    usageByProject.set(tx.project.id, cur);
  }

  const currency = material.currency ?? ctx.organization.currency;
  return {
    material,
    currency,
    ledger,
    totalValueMinor: Math.round(material.quantity * material.unitCostMinor),
    lowStock: isLowStock(material),
    usageByProject: Array.from(usageByProject.values()).sort((a, b) => b.qty - a.qty),
  };
}

export async function updateMaterial(
  ctx: TenantContext,
  id: string,
  input: {
    name: string;
    categoryId?: string;
    sku?: string;
    unit: string;
    supplier?: string;
    unitCost?: number;
    minQuantity?: number;
    location?: string;
    notes?: string;
  },
) {
  const currency = ctx.organization.currency;
  const result = await prisma.material.updateMany({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    data: {
      name: input.name.trim(),
      // Only touch the category when the caller explicitly passes one, so an edit form
      // that omits the field doesn't silently clear an existing category.
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId || null } : {}),
      sku: input.sku,
      unit: input.unit,
      supplier: input.supplier,
      unitCostMinor: input.unitCost != null ? toMinor(input.unitCost, currency) : undefined,
      minQuantity: input.minQuantity,
      location: input.location,
      notes: input.notes,
    },
  });
  if (result.count === 0) throw new Error("Material not found in organization");
}

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

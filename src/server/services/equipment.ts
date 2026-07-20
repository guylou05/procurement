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

/**
 * Equipment hub: the asset plus assignment history, maintenance log, the current
 * (open) assignment, lifetime maintenance cost, and whether maintenance is overdue.
 * Tenant-scoped.
 */
export async function getEquipmentHub(ctx: TenantContext, id: string) {
  const equipment = await prisma.equipment.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      assignments: {
        orderBy: { checkedOutAt: "desc" },
        take: 30,
        include: { project: { select: { id: true, name: true } } },
      },
      maintenance: { orderBy: { performedAt: "desc" }, take: 30 },
    },
  });
  if (!equipment) return null;

  const activeAssignment = equipment.assignments.find((a) => a.checkedInAt === null) ?? null;
  const maintenanceCostMinor = equipment.maintenance.reduce((s, m) => s + m.costMinor, 0);
  const overdue = equipment.nextMaintenanceAt != null && equipment.nextMaintenanceAt < new Date();

  return {
    equipment,
    activeAssignment,
    currency: equipment.currency ?? ctx.organization.currency,
    maintenanceCostMinor,
    overdue,
  };
}

async function assertEquipment(ctx: TenantContext, id: string) {
  const eq = await prisma.equipment.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!eq) throw new Error("Equipment not found in organization");
}

/** Checks equipment out (creates an open assignment, marks it IN_USE). */
export async function checkOutEquipment(
  ctx: TenantContext,
  id: string,
  input: { projectId?: string; workerName?: string; note?: string },
) {
  await assertEquipment(ctx, id);
  // Close any dangling open assignment first (defensive).
  await prisma.equipmentAssignment.updateMany({
    where: { equipmentId: id, checkedInAt: null },
    data: { checkedInAt: new Date() },
  });
  await prisma.$transaction([
    prisma.equipmentAssignment.create({
      data: {
        equipmentId: id,
        projectId: input.projectId || null,
        workerName: input.workerName?.trim() || null,
        note: input.note,
      },
    }),
    prisma.equipment.update({ where: { id }, data: { status: "IN_USE" } }),
  ]);
}

/** Checks equipment back in (closes the open assignment, marks it AVAILABLE). */
export async function checkInEquipment(ctx: TenantContext, id: string) {
  await assertEquipment(ctx, id);
  await prisma.$transaction([
    prisma.equipmentAssignment.updateMany({
      where: { equipmentId: id, checkedInAt: null },
      data: { checkedInAt: new Date() },
    }),
    prisma.equipment.update({ where: { id }, data: { status: "AVAILABLE" } }),
  ]);
}

/** Logs a maintenance record and advances last/next maintenance dates. */
export async function addMaintenance(
  ctx: TenantContext,
  id: string,
  input: { description?: string; cost?: number; performedAt?: Date; nextMaintenanceAt?: Date },
) {
  await assertEquipment(ctx, id);
  const currency = ctx.organization.currency;
  const performedAt = input.performedAt ?? new Date();
  await prisma.$transaction([
    prisma.equipmentMaintenance.create({
      data: {
        equipmentId: id,
        description: input.description,
        costMinor: input.cost ? toMinor(input.cost, currency) : 0,
        performedAt,
      },
    }),
    prisma.equipment.update({
      where: { id },
      data: {
        lastMaintenanceAt: performedAt,
        ...(input.nextMaintenanceAt ? { nextMaintenanceAt: input.nextMaintenanceAt } : {}),
      },
    }),
  ]);
}

export async function updateEquipment(
  ctx: TenantContext,
  id: string,
  input: {
    name: string;
    assetId: string;
    category?: string;
    serialNumber?: string;
    purchaseCost?: number;
    location?: string;
    condition?: string;
    nextMaintenanceAt?: Date;
    notes?: string;
  },
) {
  const currency = ctx.organization.currency;
  const result = await prisma.equipment.updateMany({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    data: {
      name: input.name.trim(),
      assetId: input.assetId.trim(),
      category: input.category,
      serialNumber: input.serialNumber,
      purchaseCostMinor: input.purchaseCost != null ? toMinor(input.purchaseCost, currency) : undefined,
      location: input.location,
      condition: input.condition,
      nextMaintenanceAt: input.nextMaintenanceAt ?? null,
      notes: input.notes,
    },
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

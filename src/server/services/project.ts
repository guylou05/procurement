import type { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { toMinor } from "@/lib/money";

/**
 * Project service. Every function is tenant-scoped: all queries filter by
 * ctx.organizationId, so records from other organizations are never reachable.
 */

export async function listProjects(
  ctx: TenantContext,
  filters?: { status?: ProjectStatus; city?: string },
) {
  return prisma.project.findMany({
    where: {
      organizationId: ctx.organizationId,
      deletedAt: null,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.city ? { city: { contains: filters.city, mode: "insensitive" } } : {}),
    },
    include: { client: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProject(ctx: TenantContext, id: string) {
  // Scoped find: id AND organizationId — prevents IDOR across tenants.
  return prisma.project.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      client: true,
      milestones: { orderBy: { order: "asc" } },
      members: true,
    },
  });
}

export async function createProject(
  ctx: TenantContext,
  input: {
    name: string;
    code: string;
    clientId?: string;
    description?: string;
    city?: string;
    address?: string;
    startDate?: Date;
    expectedEndDate?: Date;
    status?: ProjectStatus;
    budget?: number;
  },
) {
  const currency = ctx.organization.currency;
  return prisma.project.create({
    data: {
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      name: input.name.trim(),
      code: input.code.trim(),
      clientId: input.clientId || null,
      description: input.description,
      city: input.city,
      address: input.address,
      startDate: input.startDate,
      expectedEndDate: input.expectedEndDate,
      status: input.status ?? "PLANNED",
      currency,
      budgetMinor: input.budget ? toMinor(input.budget, currency) : 0,
    },
  });
}

export async function projectStats(ctx: TenantContext) {
  const [active, delayed, total] = await Promise.all([
    prisma.project.count({
      where: { organizationId: ctx.organizationId, status: "ACTIVE", deletedAt: null },
    }),
    prisma.project.count({
      where: { organizationId: ctx.organizationId, status: "DELAYED", deletedAt: null },
    }),
    prisma.project.count({
      where: { organizationId: ctx.organizationId, deletedAt: null },
    }),
  ]);
  return { active, delayed, total };
}

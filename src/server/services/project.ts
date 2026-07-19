import type { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { toMinor } from "@/lib/money";
import { recordAudit } from "@/server/audit";

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

/** Rich project hub: the project plus its people, milestones, and recent linked records. */
export async function getProjectHub(ctx: TenantContext, id: string) {
  const project = await prisma.project.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      client: true,
      projectManager: { select: { id: true, name: true, email: true } },
      supervisor: { select: { id: true, name: true, email: true } },
      milestones: { orderBy: { order: "asc" } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!project) return null;

  const [reports, tasks, issues, expenses, counts] = await Promise.all([
    prisma.dailyReport.findMany({
      where: { projectId: id, organizationId: ctx.organizationId },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, date: true, status: true },
    }),
    prisma.task.findMany({
      where: { projectId: id, organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, priority: true },
    }),
    prisma.issue.findMany({
      where: { projectId: id, organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, description: true, severity: true, status: true },
    }),
    prisma.expense.findMany({
      where: { projectId: id, organizationId: ctx.organizationId },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, amountMinor: true, currency: true, vendor: true, status: true, date: true },
    }),
    Promise.all([
      prisma.dailyReport.count({ where: { projectId: id, organizationId: ctx.organizationId } }),
      prisma.task.count({ where: { projectId: id, organizationId: ctx.organizationId } }),
      prisma.issue.count({ where: { projectId: id, organizationId: ctx.organizationId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.expense.count({ where: { projectId: id, organizationId: ctx.organizationId } }),
    ]),
  ]);

  return {
    project,
    recent: { reports, tasks, issues, expenses },
    counts: { reports: counts[0], tasks: counts[1], openIssues: counts[2], expenses: counts[3] },
  };
}

/**
 * Budget vs actual for a project. "Actual spend" combines approved expenses (grouped by
 * category) with the cost of materials issued/used on the project. Returns the original
 * budget, spend total, remaining and variance, plus a category breakdown for a bar view.
 */
export async function getProjectBudget(ctx: TenantContext, id: string) {
  const project = await prisma.project.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    select: { budgetMinor: true, currency: true },
  });
  if (!project) return null;
  const currency = project.currency ?? ctx.organization.currency;

  const [expenses, materialTxns] = await Promise.all([
    prisma.expense.findMany({
      where: { projectId: id, organizationId: ctx.organizationId, status: "APPROVED" },
      include: { category: { select: { name: true } } },
    }),
    prisma.materialTransaction.findMany({
      where: { projectId: id, organizationId: ctx.organizationId, type: { in: ["ISSUE", "USE"] } },
      include: { material: { select: { unitCostMinor: true } } },
    }),
  ]);

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    const key = e.category?.name ?? "Uncategorized";
    byCategory.set(key, (byCategory.get(key) ?? 0) + e.amountMinor);
  }
  const materialsMinor = materialTxns.reduce(
    (sum, tx) => sum + Math.round(tx.quantity * (tx.material?.unitCostMinor ?? 0)),
    0,
  );
  if (materialsMinor > 0) byCategory.set("Materials", (byCategory.get("Materials") ?? 0) + materialsMinor);

  const spentMinor = Array.from(byCategory.values()).reduce((a, b) => a + b, 0);
  const breakdown = Array.from(byCategory.entries())
    .map(([name, minor]) => ({ name, minor }))
    .sort((a, b) => b.minor - a.minor);

  return {
    currency,
    budgetMinor: project.budgetMinor,
    spentMinor,
    remainingMinor: project.budgetMinor - spentMinor,
    varianceMinor: project.budgetMinor - spentMinor,
    breakdown,
  };
}

export async function updateProject(
  ctx: TenantContext,
  id: string,
  input: {
    name: string;
    clientId?: string;
    description?: string;
    city?: string;
    address?: string;
    startDate?: Date;
    expectedEndDate?: Date;
    status: ProjectStatus;
    completionPercentage: number;
    budget?: number;
  },
) {
  const currency = ctx.organization.currency;
  const result = await prisma.project.updateMany({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    data: {
      name: input.name.trim(),
      clientId: input.clientId || null,
      description: input.description,
      city: input.city,
      address: input.address,
      startDate: input.startDate,
      expectedEndDate: input.expectedEndDate,
      status: input.status,
      completionPercentage: Math.max(0, Math.min(100, input.completionPercentage)),
      ...(input.budget != null ? { budgetMinor: toMinor(input.budget, currency) } : {}),
    },
  });
  if (result.count === 0) throw new Error("Project not found in organization");
  await recordAudit(ctx, { action: "project.update", recordType: "Project", recordId: id });
}

async function assertProject(ctx: TenantContext, projectId: string) {
  const p = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!p) throw new Error("Project not found in organization");
}

export async function addMilestone(
  ctx: TenantContext,
  projectId: string,
  input: { name: string; dueDate?: Date },
) {
  await assertProject(ctx, projectId);
  const count = await prisma.projectMilestone.count({ where: { projectId } });
  return prisma.projectMilestone.create({
    data: { projectId, name: input.name.trim(), dueDate: input.dueDate, order: count },
  });
}

export async function toggleMilestone(ctx: TenantContext, projectId: string, milestoneId: string) {
  await assertProject(ctx, projectId);
  const m = await prisma.projectMilestone.findFirst({
    where: { id: milestoneId, projectId },
    select: { id: true, completion: true },
  });
  if (!m) throw new Error("Milestone not found");
  const done = m.completion >= 100;
  await prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: { completion: done ? 0 : 100, completedAt: done ? null : new Date() },
  });
}

export async function listAssignableUsers(ctx: TenantContext) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: ctx.organizationId, role: { not: "CLIENT" } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return members.map((m) => ({ id: m.user.id, name: m.user.name ?? m.user.email, role: m.role }));
}

export async function addProjectMember(ctx: TenantContext, projectId: string, userId: string) {
  await assertProject(ctx, projectId);
  // Validate the user is a member of this organization before linking.
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: ctx.organizationId, userId } },
    select: { userId: true },
  });
  if (!membership) throw new Error("User is not a member of this organization");
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {},
    create: { projectId, userId },
  });
}

export async function removeProjectMember(ctx: TenantContext, projectId: string, userId: string) {
  await assertProject(ctx, projectId);
  await prisma.projectMember.deleteMany({ where: { projectId, userId } });
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

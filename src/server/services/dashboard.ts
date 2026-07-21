import type { ExpenseStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { projectStats } from "@/server/services/project";
import { pendingReportCount } from "@/server/services/daily-report";
import { workersOnSiteToday } from "@/server/services/attendance";
import { maintenanceDueCount } from "@/server/services/equipment";

/** Aggregates the role-aware dashboard metrics, all tenant-scoped. */
export async function getDashboardData(ctx: TenantContext) {
  try {
    const [projects, pendingReports, onSite, openIssues, pendingExpenses, maintenanceDue] =
      await Promise.all([
        projectStats(ctx),
        pendingReportCount(ctx),
        workersOnSiteToday(ctx),
        prisma.issue.count({
          where: { organizationId: ctx.organizationId, status: { in: ["OPEN", "IN_PROGRESS"] } },
        }),
        prisma.expense.count({
          where: { organizationId: ctx.organizationId, status: "SUBMITTED" },
        }),
        maintenanceDueCount(ctx),
      ]);

    return {
      activeProjects: projects.active,
      projectsBehind: projects.delayed,
      workersOnSite: onSite,
      pendingReports,
      openIssues,
      pendingExpenses,
      maintenanceDue,
    };
  } catch (err) {
    console.error("[getDashboardData] failed:", err);
    throw err;
  }
}

/** The signed-in user's own open work: assigned tasks that aren't done, newest first. */
export async function getMyWork(ctx: TenantContext) {
  const openStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "AWAITING_REVIEW"];
  const [tasks, openCount] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId: ctx.organizationId,
        assigneeId: ctx.userId,
        status: { in: openStatuses },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        project: { select: { name: true } },
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.task.count({
      where: {
        organizationId: ctx.organizationId,
        assigneeId: ctx.userId,
        status: { in: openStatuses },
      },
    }),
  ]);
  return { tasks, openCount };
}

const startOfUTCMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 1));

/**
 * Financial snapshot + recent activity for the dashboard command center.
 * All tenant-scoped. Spend counts APPROVED and REIMBURSED expenses; the
 * month-over-month delta drives the trend indicator on the KPI card.
 */
export async function getDashboardFinancials(ctx: TenantContext) {
  const org = ctx.organizationId;
  const spentStatuses: ExpenseStatus[] = ["APPROVED", "REIMBURSED"];
  const now = new Date();
  const monthStart = startOfUTCMonth(now.getUTCFullYear(), now.getUTCMonth());
  const lastMonthStart = startOfUTCMonth(now.getUTCFullYear(), now.getUTCMonth() - 1);

  const [thisMonth, lastMonth, pendingReimburse, materials, recent] = await Promise.all([
    prisma.expense.aggregate({
      where: { organizationId: org, status: { in: spentStatuses }, date: { gte: monthStart } },
      _sum: { amountMinor: true },
    }),
    prisma.expense.aggregate({
      where: {
        organizationId: org,
        status: { in: spentStatuses },
        date: { gte: lastMonthStart, lt: monthStart },
      },
      _sum: { amountMinor: true },
    }),
    prisma.expense.aggregate({
      where: { organizationId: org, status: "APPROVED" },
      _sum: { amountMinor: true },
    }),
    prisma.material.findMany({
      where: { organizationId: org, deletedAt: null },
      select: { quantity: true, unitCostMinor: true },
    }),
    prisma.expense.findMany({
      where: { organizationId: org },
      select: {
        id: true,
        vendor: true,
        amountMinor: true,
        currency: true,
        status: true,
        date: true,
        createdAt: true,
        project: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const spendThisMonthMinor = thisMonth._sum.amountMinor ?? 0;
  const spendLastMonthMinor = lastMonth._sum.amountMinor ?? 0;
  const delta =
    spendLastMonthMinor > 0
      ? ((spendThisMonthMinor - spendLastMonthMinor) / spendLastMonthMinor) * 100
      : null;
  const inventoryValueMinor = materials.reduce(
    (sum, m) => sum + Math.round(m.quantity * m.unitCostMinor),
    0,
  );

  return {
    spendThisMonthMinor,
    spendLastMonthMinor,
    spendDeltaPct: delta === null ? null : Math.round(delta),
    pendingReimburseMinor: pendingReimburse._sum.amountMinor ?? 0,
    inventoryValueMinor,
    recentExpenses: recent,
  };
}

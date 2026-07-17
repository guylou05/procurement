import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { projectStats } from "@/server/services/project";
import { pendingReportCount } from "@/server/services/daily-report";
import { workersOnSiteToday } from "@/server/services/attendance";
import { maintenanceDueCount } from "@/server/services/equipment";

/** Aggregates the role-aware dashboard metrics, all tenant-scoped. */
export async function getDashboardData(ctx: TenantContext) {
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
}

import { prisma } from "@/lib/prisma";

/**
 * Platform admin service. Unlike every other service in this codebase, these
 * queries are deliberately NOT tenant-scoped — this is the one legitimate place
 * cross-organization data is read, and every entry point is gated by
 * requireSuperAdmin(). Never import this module from tenant-scoped code paths.
 */

export async function getPlatformStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5);

  const [organizations, suspendedOrganizations, users, projects, newOrganizations] =
    await Promise.all([
      prisma.organization.count({ where: { deletedAt: null } }),
      prisma.organization.count({ where: { deletedAt: { not: null } } }),
      prisma.user.count(),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

  return { organizations, suspendedOrganizations, users, projects, newOrganizations };
}

export async function listOrganizationsForAdmin() {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, projects: true } },
    },
  });
  return orgs;
}

export async function getOrganizationForAdmin(id: string) {
  return prisma.organization.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { name: true, email: true } } } },
      projects: {
        where: { deletedAt: null },
        select: { id: true, name: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 10,
      },
      _count: { select: { members: true, projects: true } },
    },
  });
}

export async function setOrganizationSuspended(
  adminUserId: string,
  organizationId: string,
  suspended: boolean,
) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, deletedAt: true },
  });
  if (!org) throw new Error("Organization not found");

  await prisma.organization.update({
    where: { id: organizationId },
    data: { deletedAt: suspended ? new Date() : null },
  });

  // Platform-level audit entry — written directly since there is no tenant context.
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: adminUserId,
      action: suspended ? "platform.organization.suspend" : "platform.organization.restore",
      recordType: "Organization",
      recordId: organizationId,
      previousValue: { deletedAt: org.deletedAt },
      newValue: { deletedAt: suspended ? new Date() : null },
    },
  });
}

export async function listPlatformAuditLog(limit = 50) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      organization: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });
}

export interface TrendPoint {
  label: string; // short week label, e.g. "Feb 12"
  value: number;
}

/** Start-of-week (Monday, UTC) for a date. */
function startOfWeek(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (x.getUTCDay() + 6) % 7; // 0 = Monday
  x.setUTCDate(x.getUTCDate() - day);
  return x;
}

/**
 * Weekly counts of a datetime column over the last `weeks` weeks, returned as a dense
 * series (missing weeks filled with 0) so charts render a continuous trend. Counts are
 * bucketed in JS from raw createdAt values, which keeps this database-agnostic (no
 * Postgres-specific date_trunc) and easy to unit test.
 */
async function weeklyTrend(
  rows: { createdAt: Date }[],
  weeks: number,
): Promise<TrendPoint[]> {
  const now = new Date();
  const buckets: { start: number; label: string; value: number }[] = [];
  const thisWeek = startOfWeek(now);
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setUTCDate(start.getUTCDate() - i * 7);
    buckets.push({
      start: start.getTime(),
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      value: 0,
    });
  }
  for (const row of rows) {
    const ws = startOfWeek(new Date(row.createdAt)).getTime();
    const bucket = buckets.find((b) => b.start === ws);
    if (bucket) bucket.value += 1;
  }
  return buckets.map((b) => ({ label: b.label, value: b.value }));
}

export async function getPlatformTrends(weeks = 8) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - weeks * 7);

  const [orgs, users, projects] = await Promise.all([
    prisma.organization.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.project.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  return {
    organizations: await weeklyTrend(orgs, weeks),
    users: await weeklyTrend(users, weeks),
    projects: await weeklyTrend(projects, weeks),
  };
}

export async function getTopOrganizations(limit = 5) {
  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { members: true, projects: true } } },
  });
  return orgs
    .sort((a, b) => b._count.projects - a._count.projects || b._count.members - a._count.members)
    .slice(0, limit);
}

export async function getSubscriptionSummary() {
  const [activeSubs, plans] = await Promise.all([
    prisma.subscription.findMany({
      where: { status: { in: ["ACTIVE", "TRIALING"] } },
      include: { plan: { select: { priceMinor: true, currency: true } } },
    }),
    prisma.plan.count(),
  ]);
  // Est. MRR in a single currency is only meaningful if plans share one; we surface the
  // count of active subs plus a naive minor-unit sum for a directional figure.
  const mrrMinor = activeSubs.reduce((sum, s) => sum + (s.plan?.priceMinor ?? 0), 0);
  const currency = activeSubs[0]?.plan?.currency ?? "USD";
  return { activeSubscriptions: activeSubs.length, plans, mrrMinor, currency };
}

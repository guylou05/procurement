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

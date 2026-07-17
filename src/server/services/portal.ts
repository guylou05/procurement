import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { invoiceTotalMinor } from "@/lib/money";

/**
 * Client-portal service. This is a HARD isolation boundary: it returns only
 * client-safe fields and never selects payroll, worker rates, margins, budgets,
 * unapproved expenses or internal comments/incidents. Everything is scoped to the
 * client record linked to the authenticated portal user within the tenant.
 */

/** Resolves the Client row linked to the current portal user, or null. */
async function resolvePortalClient(ctx: TenantContext) {
  return prisma.client.findFirst({
    where: { organizationId: ctx.organizationId, userId: ctx.userId, deletedAt: null },
    select: { id: true, name: true },
  });
}

export async function listPortalProjects(ctx: TenantContext) {
  const client = await resolvePortalClient(ctx);
  if (!client) return { client: null, projects: [] as PortalProjectSummary[] };

  const projects = await prisma.project.findMany({
    where: { organizationId: ctx.organizationId, clientId: client.id, deletedAt: null },
    // Explicit safe field selection — budget/contract value intentionally omitted.
    select: {
      id: true,
      name: true,
      status: true,
      completionPercentage: true,
      city: true,
      expectedEndDate: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return { client, projects };
}

export interface PortalProjectSummary {
  id: string;
  name: string;
  status: string;
  completionPercentage: number;
  city: string | null;
  expectedEndDate: Date | null;
}

export async function getPortalProject(ctx: TenantContext, projectId: string) {
  const client = await resolvePortalClient(ctx);
  if (!client) return null;

  // Scoped by org + this client's id + the requested project — prevents IDOR into
  // another client's or another org's project.
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: ctx.organizationId,
      clientId: client.id,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      completionPercentage: true,
      city: true,
      startDate: true,
      expectedEndDate: true,
      currency: true,
      milestones: {
        select: { id: true, name: true, completion: true, dueDate: true, completedAt: true },
        orderBy: { order: "asc" },
      },
      // Only approved-report photos are visible to clients.
      dailyReports: {
        where: { status: "APPROVED" },
        select: {
          date: true,
          photos: { select: { id: true, caption: true, attachmentId: true } },
        },
        orderBy: { date: "desc" },
        take: 20,
      },
    },
  });
  if (!project) return null;

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: ctx.organizationId, clientId: client.id, projectId },
    select: {
      id: true,
      number: true,
      status: true,
      issueDate: true,
      dueDate: true,
      currency: true,
      taxMinor: true,
      discountMinor: true,
      items: { select: { quantity: true, unitPriceMinor: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  const invoiceSummaries = invoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    status: inv.status,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    currency: inv.currency,
    totalMinor: invoiceTotalMinor(inv.items, inv.taxMinor, inv.discountMinor),
  }));

  return { project, invoices: invoiceSummaries };
}

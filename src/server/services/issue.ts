import type { IssueSeverity, IssueStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";

/** Issue & incident service — tenant-scoped. */

export async function listIssues(ctx: TenantContext) {
  return prisma.issue.findMany({
    where: { organizationId: ctx.organizationId },
    include: { project: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function createIssue(
  ctx: TenantContext,
  input: {
    projectId: string;
    category: string;
    severity: IssueSeverity;
    description: string;
  },
) {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found in organization");

  return prisma.issue.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: input.projectId,
      category: input.category,
      severity: input.severity,
      description: input.description,
      reportedById: ctx.userId,
      status: "OPEN",
    },
  });
}

export async function setIssueStatus(
  ctx: TenantContext,
  id: string,
  status: IssueStatus,
  resolution?: string,
) {
  // Scoped update prevents cross-tenant status changes.
  const result = await prisma.issue.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: {
      status,
      resolution: status === "RESOLVED" || status === "CLOSED" ? resolution : undefined,
      resolvedAt: status === "RESOLVED" ? new Date() : undefined,
    },
  });
  if (result.count === 0) throw new Error("Issue not found in organization");
}

import type { TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";

/** Task / work-order service — tenant-scoped. */

export async function listTasks(ctx: TenantContext) {
  return prisma.task.findMany({
    where: { organizationId: ctx.organizationId },
    include: { project: { select: { name: true } }, assignee: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function createTask(
  ctx: TenantContext,
  input: {
    projectId: string;
    title: string;
    description?: string;
    priority: TaskPriority;
    dueDate?: Date;
  },
) {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found in organization");

  return prisma.task.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: input.projectId,
      title: input.title.trim(),
      description: input.description,
      priority: input.priority,
      dueDate: input.dueDate,
      status: "TODO",
    },
  });
}

export async function setTaskStatus(ctx: TenantContext, id: string, status: TaskStatus) {
  const result = await prisma.task.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: { status },
  });
  if (result.count === 0) throw new Error("Task not found in organization");
}

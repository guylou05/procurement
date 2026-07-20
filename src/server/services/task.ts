import type { TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";

/** Task / work-order service — tenant-scoped. */

export async function listTasks(ctx: TenantContext) {
  return prisma.task.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      project: { select: { name: true } },
      assignee: { select: { name: true, email: true } },
      checklist: { select: { done: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
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

/** Full task for the detail view: project, assignee, checklist and comments (author names). */
export async function getTaskDetail(ctx: TenantContext, id: string) {
  const task = await prisma.task.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      checklist: { orderBy: { order: "asc" } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!task) return null;

  const authorIds = [...new Set(task.comments.map((c) => c.authorId))];
  const authors = authorIds.length
    ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true, email: true } })
    : [];
  const authorName = new Map(authors.map((a) => [a.id, a.name ?? a.email]));

  return {
    task,
    comments: task.comments.map((c) => ({ ...c, authorName: authorName.get(c.authorId) ?? "—" })),
  };
}

export async function updateTask(
  ctx: TenantContext,
  id: string,
  input: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId?: string;
    dueDate?: Date;
  },
) {
  // If an assignee is supplied, ensure they belong to this org.
  if (input.assigneeId) {
    const member = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: ctx.organizationId, userId: input.assigneeId } },
      select: { userId: true },
    });
    if (!member) throw new Error("Assignee is not a member of this organization");
  }
  const result = await prisma.task.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: {
      title: input.title.trim(),
      description: input.description,
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId || null,
      dueDate: input.dueDate ?? null,
    },
  });
  if (result.count === 0) throw new Error("Task not found in organization");
}

async function assertTask(ctx: TenantContext, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!task) throw new Error("Task not found in organization");
}

export async function addTaskComment(ctx: TenantContext, taskId: string, body: string) {
  await assertTask(ctx, taskId);
  return prisma.taskComment.create({ data: { taskId, authorId: ctx.userId, body: body.trim() } });
}

export async function addChecklistItem(ctx: TenantContext, taskId: string, label: string) {
  await assertTask(ctx, taskId);
  const count = await prisma.taskChecklistItem.count({ where: { taskId } });
  return prisma.taskChecklistItem.create({ data: { taskId, label: label.trim(), order: count } });
}

export async function toggleChecklistItem(ctx: TenantContext, taskId: string, itemId: string) {
  await assertTask(ctx, taskId);
  const item = await prisma.taskChecklistItem.findFirst({ where: { id: itemId, taskId }, select: { done: true } });
  if (!item) throw new Error("Checklist item not found");
  await prisma.taskChecklistItem.update({ where: { id: itemId }, data: { done: !item.done } });
}

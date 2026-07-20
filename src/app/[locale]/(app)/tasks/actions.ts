"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import {
  createTask,
  setTaskStatus,
  updateTask,
  addTaskComment,
  addChecklistItem,
  toggleChecklistItem,
} from "@/server/services/task";

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
});

export async function createTaskAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "task:manage");

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/tasks/new?error=validation`);

  await createTask(ctx, {
    projectId: parsed.data.projectId,
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
  });

  revalidatePath(`/${locale}/tasks`);
  redirect(`/${locale}/tasks`);
}

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "AWAITING_REVIEW", "COMPLETED", "CANCELLED"]),
});

export async function setTaskStatusAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "task:complete");

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/tasks?error=validation`);

  await setTaskStatus(ctx, parsed.data.id, parsed.data.status);
  revalidatePath(`/${locale}/tasks`);
}

const updateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "AWAITING_REVIEW", "COMPLETED", "CANCELLED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function updateTaskAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "task:manage");
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/tasks?error=validation`);

  await updateTask(ctx, parsed.data.id, {
    title: parsed.data.title,
    description: parsed.data.description,
    status: parsed.data.status,
    priority: parsed.data.priority,
    assigneeId: parsed.data.assigneeId || undefined,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
  });
  revalidatePath(`/${locale}/tasks`);
  // Redirect (rather than a soft revalidate) so the edit form's uncontrolled
  // <select> defaultValues reflect the saved state instead of showing stale values.
  redirect(`/${locale}/tasks/${parsed.data.id}`);
}

const commentSchema = z.object({ id: z.string().min(1), body: z.string().min(1) });

export async function addTaskCommentAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await addTaskComment(ctx, parsed.data.id, parsed.data.body);
  revalidatePath(`/${locale}/tasks/${parsed.data.id}`);
}

const checklistSchema = z.object({ id: z.string().min(1), label: z.string().min(1) });

export async function addChecklistItemAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "task:manage");
  const parsed = checklistSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await addChecklistItem(ctx, parsed.data.id, parsed.data.label);
  revalidatePath(`/${locale}/tasks/${parsed.data.id}`);
}

const toggleSchema = z.object({ id: z.string().min(1), itemId: z.string().min(1) });

export async function toggleChecklistItemAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await toggleChecklistItem(ctx, parsed.data.id, parsed.data.itemId);
  revalidatePath(`/${locale}/tasks/${parsed.data.id}`);
}

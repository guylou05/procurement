"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { createTask, setTaskStatus } from "@/server/services/task";

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

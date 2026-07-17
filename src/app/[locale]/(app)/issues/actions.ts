"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { createIssue, setIssueStatus } from "@/server/services/issue";

const createSchema = z.object({
  projectId: z.string().min(1),
  category: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string().min(1),
});

export async function createIssueAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "issue:report");

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/issues/new?error=validation`);

  await createIssue(ctx, parsed.data);
  revalidatePath(`/${locale}/issues`);
  redirect(`/${locale}/issues`);
}

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export async function setIssueStatusAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "issue:resolve");

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/issues?error=validation`);

  await setIssueStatus(ctx, parsed.data.id, parsed.data.status);
  revalidatePath(`/${locale}/issues`);
}

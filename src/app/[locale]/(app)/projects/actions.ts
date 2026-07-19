"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import {
  createProject,
  updateProject,
  addMilestone,
  toggleMilestone,
  addProjectMember,
  removeProjectMember,
} from "@/server/services/project";
import { recordAudit } from "@/server/audit";

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  clientId: z.string().optional(),
  description: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  budget: z.coerce.number().min(0).optional(),
});

export async function createProjectAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "project:create");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/projects/new?error=validation`);

  const project = await createProject(ctx, {
    name: parsed.data.name,
    code: parsed.data.code,
    clientId: parsed.data.clientId || undefined,
    description: parsed.data.description,
    city: parsed.data.city,
    address: parsed.data.address,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    expectedEndDate: parsed.data.expectedEndDate
      ? new Date(parsed.data.expectedEndDate)
      : undefined,
    budget: parsed.data.budget,
  });

  await recordAudit(ctx, {
    action: "project.create",
    recordType: "Project",
    recordId: project.id,
    newValue: { name: project.name, code: project.code },
  });

  revalidatePath(`/${locale}/projects`);
  redirect(`/${locale}/projects`);
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  clientId: z.string().optional(),
  description: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  status: z.enum(["DRAFT", "PLANNED", "ACTIVE", "ON_HOLD", "DELAYED", "COMPLETED", "CANCELLED"]),
  completionPercentage: z.coerce.number().min(0).max(100),
  budget: z.coerce.number().min(0).optional(),
});

export async function updateProjectAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "project:create");

  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/projects?error=validation`);

  await updateProject(ctx, parsed.data.id, {
    name: parsed.data.name,
    clientId: parsed.data.clientId || undefined,
    description: parsed.data.description,
    city: parsed.data.city,
    address: parsed.data.address,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    expectedEndDate: parsed.data.expectedEndDate ? new Date(parsed.data.expectedEndDate) : undefined,
    status: parsed.data.status,
    completionPercentage: parsed.data.completionPercentage,
    budget: parsed.data.budget,
  });

  revalidatePath(`/${locale}/projects/${parsed.data.id}`);
  redirect(`/${locale}/projects/${parsed.data.id}`);
}

const milestoneSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  dueDate: z.string().optional(),
});

export async function addMilestoneAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "project:create");
  const parsed = milestoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await addMilestone(ctx, parsed.data.projectId, {
    name: parsed.data.name,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
  });
  revalidatePath(`/${locale}/projects/${parsed.data.projectId}`);
}

const toggleSchema = z.object({ projectId: z.string().min(1), milestoneId: z.string().min(1) });

export async function toggleMilestoneAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "project:create");
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await toggleMilestone(ctx, parsed.data.projectId, parsed.data.milestoneId);
  revalidatePath(`/${locale}/projects/${parsed.data.projectId}`);
}

const memberSchema = z.object({ projectId: z.string().min(1), userId: z.string().min(1) });

export async function addProjectMemberAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "project:assign");
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await addProjectMember(ctx, parsed.data.projectId, parsed.data.userId);
  revalidatePath(`/${locale}/projects/${parsed.data.projectId}`);
}

export async function removeProjectMemberAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "project:assign");
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await removeProjectMember(ctx, parsed.data.projectId, parsed.data.userId);
  revalidatePath(`/${locale}/projects/${parsed.data.projectId}`);
}

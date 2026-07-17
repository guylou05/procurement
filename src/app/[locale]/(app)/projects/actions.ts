"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { createProject } from "@/server/services/project";
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

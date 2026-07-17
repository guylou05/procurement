"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { createWorker } from "@/server/services/worker";
import { recordAudit } from "@/server/audit";

const schema = z.object({
  fullName: z.string().min(1),
  workerId: z.string().min(1),
  jobTitle: z.string().optional(),
  skill: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  employmentType: z.enum([
    "PERMANENT",
    "TEMPORARY",
    "CONTRACTOR",
    "SUBCONTRACTOR",
    "DAILY_LABORER",
  ]),
  dailyRate: z.coerce.number().min(0).optional(),
  hireDate: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export async function createWorkerAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "worker:manage");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/workers/new?error=validation`);

  const worker = await createWorker(ctx, {
    fullName: parsed.data.fullName,
    workerId: parsed.data.workerId,
    jobTitle: parsed.data.jobTitle,
    skill: parsed.data.skill,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    employmentType: parsed.data.employmentType,
    dailyRate: parsed.data.dailyRate,
    hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : undefined,
    emergencyContact: parsed.data.emergencyContact,
  });

  await recordAudit(ctx, {
    action: "worker.create",
    recordType: "Worker",
    recordId: worker.id,
    newValue: { fullName: worker.fullName, workerId: worker.workerId },
  });

  revalidatePath(`/${locale}/workers`);
  redirect(`/${locale}/workers`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import {
  createWorker,
  updateWorker,
  addCertification,
  removeCertification,
} from "@/server/services/worker";
import { uploadAttachment } from "@/server/services/attachment";
import { prisma } from "@/lib/prisma";
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

const updateSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  jobTitle: z.string().optional(),
  skill: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  employmentType: z.enum(["PERMANENT", "TEMPORARY", "CONTRACTOR", "SUBCONTRACTOR", "DAILY_LABORER"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  dailyRate: z.coerce.number().min(0).optional(),
  hireDate: z.string().optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
});

export async function updateWorkerAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "worker:manage");
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/workers?error=validation`);

  await updateWorker(ctx, parsed.data.id, {
    fullName: parsed.data.fullName,
    jobTitle: parsed.data.jobTitle,
    skill: parsed.data.skill,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    employmentType: parsed.data.employmentType,
    status: parsed.data.status,
    dailyRate: parsed.data.dailyRate,
    hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : undefined,
    emergencyContact: parsed.data.emergencyContact,
    notes: parsed.data.notes,
  });

  revalidatePath(`/${locale}/workers/${parsed.data.id}`);
  redirect(`/${locale}/workers/${parsed.data.id}`);
}

const certSchema = z.object({
  workerId: z.string().min(1),
  name: z.string().min(1),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function addCertificationAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "worker:manage");
  const parsed = certSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await addCertification(ctx, parsed.data.workerId, {
    name: parsed.data.name,
    issuedAt: parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : undefined,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
  });
  revalidatePath(`/${locale}/workers/${parsed.data.workerId}`);
}

const removeCertSchema = z.object({ workerId: z.string().min(1), certId: z.string().min(1) });

export async function removeCertificationAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "worker:manage");
  const parsed = removeCertSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await removeCertification(ctx, parsed.data.workerId, parsed.data.certId);
  revalidatePath(`/${locale}/workers/${parsed.data.workerId}`);
}

export async function uploadWorkerDocumentAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "worker:manage");
  const workerId = String(formData.get("workerId") ?? "");
  const file = formData.get("document");
  if (!workerId || !(file instanceof File) || file.size === 0) return;

  const worker = await prisma.worker.findFirst({
    where: { id: workerId, organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!worker) return;

  const attachment = await uploadAttachment(ctx, file);
  await prisma.workerDocument.create({
    data: {
      workerId,
      attachmentId: attachment.id,
      name: String(formData.get("name") ?? "") || file.name,
    },
  });
  revalidatePath(`/${locale}/workers/${workerId}`);
}

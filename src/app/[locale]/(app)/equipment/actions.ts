"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import {
  createEquipment,
  setEquipmentStatus,
  checkOutEquipment,
  checkInEquipment,
  addMaintenance,
  updateEquipment,
} from "@/server/services/equipment";

const createSchema = z.object({
  name: z.string().min(1),
  assetId: z.string().min(1),
  category: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseCost: z.coerce.number().min(0).optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
  nextMaintenanceAt: z.string().optional(),
});

export async function createEquipmentAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "equipment:manage");

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/equipment/new?error=validation`);

  await createEquipment(ctx, {
    name: parsed.data.name,
    assetId: parsed.data.assetId,
    category: parsed.data.category,
    serialNumber: parsed.data.serialNumber,
    purchaseCost: parsed.data.purchaseCost,
    location: parsed.data.location,
    condition: parsed.data.condition,
    nextMaintenanceAt: parsed.data.nextMaintenanceAt
      ? new Date(parsed.data.nextMaintenanceAt)
      : undefined,
  });

  revalidatePath(`/${locale}/equipment`);
  redirect(`/${locale}/equipment`);
}

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "AVAILABLE",
    "ASSIGNED",
    "IN_USE",
    "UNDER_MAINTENANCE",
    "DAMAGED",
    "LOST",
    "RETIRED",
  ]),
});

export async function setEquipmentStatusAction(
  locale: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "equipment:manage");

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/equipment?error=validation`);

  await setEquipmentStatus(ctx, parsed.data.id, parsed.data.status);
  revalidatePath(`/${locale}/equipment`);
}

const checkOutSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().optional(),
  workerName: z.string().optional(),
  note: z.string().optional(),
});

export async function checkOutEquipmentAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "equipment:manage");
  const parsed = checkOutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await checkOutEquipment(ctx, parsed.data.id, {
    projectId: parsed.data.projectId || undefined,
    workerName: parsed.data.workerName,
    note: parsed.data.note,
  });
  revalidatePath(`/${locale}/equipment/${parsed.data.id}`);
  revalidatePath(`/${locale}/equipment`);
}

export async function checkInEquipmentAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "equipment:manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await checkInEquipment(ctx, id);
  revalidatePath(`/${locale}/equipment/${id}`);
  revalidatePath(`/${locale}/equipment`);
}

const maintenanceSchema = z.object({
  id: z.string().min(1),
  description: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
  performedAt: z.string().optional(),
  nextMaintenanceAt: z.string().optional(),
});

export async function addMaintenanceAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "equipment:manage");
  const parsed = maintenanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await addMaintenance(ctx, parsed.data.id, {
    description: parsed.data.description,
    cost: parsed.data.cost,
    performedAt: parsed.data.performedAt ? new Date(parsed.data.performedAt) : undefined,
    nextMaintenanceAt: parsed.data.nextMaintenanceAt ? new Date(parsed.data.nextMaintenanceAt) : undefined,
  });
  revalidatePath(`/${locale}/equipment/${parsed.data.id}`);
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  assetId: z.string().min(1),
  category: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseCost: z.coerce.number().min(0).optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
  nextMaintenanceAt: z.string().optional(),
  notes: z.string().optional(),
});

export async function updateEquipmentAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "equipment:manage");
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/equipment?error=validation`);
  await updateEquipment(ctx, parsed.data.id, {
    name: parsed.data.name,
    assetId: parsed.data.assetId,
    category: parsed.data.category,
    serialNumber: parsed.data.serialNumber,
    purchaseCost: parsed.data.purchaseCost,
    location: parsed.data.location,
    condition: parsed.data.condition,
    nextMaintenanceAt: parsed.data.nextMaintenanceAt ? new Date(parsed.data.nextMaintenanceAt) : undefined,
    notes: parsed.data.notes,
  });
  revalidatePath(`/${locale}/equipment/${parsed.data.id}`);
  redirect(`/${locale}/equipment/${parsed.data.id}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { createEquipment, setEquipmentStatus } from "@/server/services/equipment";

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

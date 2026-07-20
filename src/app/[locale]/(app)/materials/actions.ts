"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { createMaterial, recordTransaction, updateMaterial } from "@/server/services/material";

const createSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  unit: z.string().min(1),
  supplier: z.string().optional(),
  unitCost: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().min(0).optional(),
  minQuantity: z.coerce.number().min(0).optional(),
  location: z.string().optional(),
});

export async function createMaterialAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "material:manage");

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/materials/new?error=validation`);

  await createMaterial(ctx, parsed.data);
  revalidatePath(`/${locale}/materials`);
  redirect(`/${locale}/materials`);
}

const txnSchema = z.object({
  materialId: z.string().min(1),
  type: z.enum([
    "PURCHASE",
    "RECEIVE",
    "ISSUE",
    "USE",
    "RETURN",
    "TRANSFER",
    "ADJUSTMENT",
    "DAMAGE",
    "LOSS",
  ]),
  quantity: z.coerce.number().positive(),
  projectId: z.string().optional(),
  counterparty: z.string().optional(),
  approvedById: z.string().optional(),
  reason: z.string().optional(),
});

export async function recordTransactionAction(
  locale: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "material:manage");

  const parsed = txnSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/materials?error=validation`);

  await recordTransaction(ctx, {
    materialId: parsed.data.materialId,
    type: parsed.data.type,
    quantity: parsed.data.quantity,
    projectId: parsed.data.projectId || undefined,
    counterparty: parsed.data.counterparty,
    approvedById: parsed.data.approvedById || undefined,
    reason: parsed.data.reason,
  });
  revalidatePath(`/${locale}/materials`);
  revalidatePath(`/${locale}/materials/${parsed.data.materialId}`);
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().optional(),
  sku: z.string().optional(),
  unit: z.string().min(1),
  supplier: z.string().optional(),
  unitCost: z.coerce.number().min(0).optional(),
  minQuantity: z.coerce.number().min(0).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export async function updateMaterialAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "material:manage");
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/materials?error=validation`);

  await updateMaterial(ctx, parsed.data.id, {
    name: parsed.data.name,
    categoryId: parsed.data.categoryId || undefined,
    sku: parsed.data.sku,
    unit: parsed.data.unit,
    supplier: parsed.data.supplier,
    unitCost: parsed.data.unitCost,
    minQuantity: parsed.data.minQuantity,
    location: parsed.data.location,
    notes: parsed.data.notes,
  });
  revalidatePath(`/${locale}/materials/${parsed.data.id}`);
  redirect(`/${locale}/materials/${parsed.data.id}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { createMaterial, recordTransaction } from "@/server/services/material";

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

  await recordTransaction(ctx, parsed.data);
  revalidatePath(`/${locale}/materials`);
}

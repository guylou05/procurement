"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import {
  createMaterialRequest,
  setMaterialRequestStatus,
} from "@/server/services/material-request";

const baseSchema = z.object({
  projectId: z.string().optional(),
  note: z.string().optional(),
  intent: z.enum(["draft", "submit"]).default("submit"),
});

export async function createMaterialRequestAction(
  locale: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "material:request");

  const base = baseSchema.safeParse(Object.fromEntries(formData));
  if (!base.success) redirect(`/${locale}/materials/requests/new?error=validation`);

  const names = formData.getAll("name").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const units = formData.getAll("unit").map(String);
  const items = names.map((name, i) => ({
    name,
    quantity: Number(quantities[i] ?? 0),
    unit: units[i] ?? "unit",
  }));

  const result = await createMaterialRequest(ctx, {
    projectId: base.data.projectId || undefined,
    note: base.data.note,
    items,
    submit: base.data.intent === "submit",
  });
  if ("error" in result) redirect(`/${locale}/materials/requests/new?error=${result.error}`);

  revalidatePath(`/${locale}/materials/requests`);
  redirect(`/${locale}/materials/requests`);
}

const decideSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED", "ORDERED", "RECEIVED", "CANCELLED"]),
});

export async function decideMaterialRequestAction(
  locale: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "material:approve");

  const parsed = decideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/materials/requests?error=validation`);

  await setMaterialRequestStatus(ctx, parsed.data.id, parsed.data.status);
  revalidatePath(`/${locale}/materials/requests`);
}

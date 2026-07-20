"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import {
  createExpense,
  decideExpense,
  submitDraftExpense,
  markExpenseReimbursed,
  attachReceipt,
} from "@/server/services/expense";

const createSchema = z.object({
  projectId: z.string().optional(),
  amount: z.coerce.number().positive(),
  vendor: z.string().optional(),
  date: z.string().min(1),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CARD", "CHEQUE", "OTHER"]),
  description: z.string().optional(),
  intent: z.enum(["draft", "submit"]).default("submit"),
});

export async function createExpenseAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "expense:record");

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/expenses/new?error=validation`);

  await createExpense(ctx, {
    projectId: parsed.data.projectId || undefined,
    amount: parsed.data.amount,
    vendor: parsed.data.vendor,
    date: new Date(parsed.data.date),
    paymentMethod: parsed.data.paymentMethod,
    description: parsed.data.description,
    submit: parsed.data.intent === "submit",
  });

  revalidatePath(`/${locale}/expenses`);
  redirect(`/${locale}/expenses`);
}

const decideSchema = z.object({
  id: z.string().min(1),
  approve: z.enum(["true", "false"]),
  rejectionReason: z.string().optional(),
});

export async function decideExpenseAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "expense:approve");

  const parsed = decideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/expenses?error=validation`);

  await decideExpense(ctx, parsed.data.id, {
    approve: parsed.data.approve === "true",
    rejectionReason: parsed.data.rejectionReason,
  });

  revalidatePath(`/${locale}/expenses`);
  revalidatePath(`/${locale}/expenses/${parsed.data.id}`);
}

export async function submitExpenseAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "expense:record");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await submitDraftExpense(ctx, id);
  revalidatePath(`/${locale}/expenses`);
  revalidatePath(`/${locale}/expenses/${id}`);
}

export async function markReimbursedAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "expense:approve");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await markExpenseReimbursed(ctx, id);
  revalidatePath(`/${locale}/expenses`);
  revalidatePath(`/${locale}/expenses/${id}`);
}

export async function uploadReceiptAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "expense:record");
  const id = String(formData.get("id") ?? "");
  const file = formData.get("receipt");
  if (!id || !(file instanceof File) || file.size === 0) return;
  await attachReceipt(ctx, id, file);
  revalidatePath(`/${locale}/expenses/${id}`);
}

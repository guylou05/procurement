"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { createInvoice, recordPayment } from "@/server/services/invoice";

const itemSchema = z.object({
  description: z.string(),
  quantity: z.coerce.number(),
  unitPrice: z.coerce.number(),
});

const createSchema = z.object({
  number: z.string().min(1),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  dueDate: z.string().optional(),
  tax: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
});

export async function createInvoiceAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "invoice:manage");

  const base = createSchema.safeParse(Object.fromEntries(formData));
  if (!base.success) redirect(`/${locale}/invoices/new?error=validation`);

  // Line items arrive as parallel arrays (description[], quantity[], unitPrice[]).
  const descriptions = formData.getAll("description");
  const quantities = formData.getAll("quantity");
  const unitPrices = formData.getAll("unitPrice");
  const items = descriptions
    .map((d, i) => itemSchema.safeParse({
      description: d,
      quantity: quantities[i],
      unitPrice: unitPrices[i],
    }))
    .filter((r) => r.success)
    .map((r) => (r as { data: { description: string; quantity: number; unitPrice: number } }).data);

  const result = await createInvoice(ctx, {
    number: base.data.number,
    clientId: base.data.clientId || undefined,
    projectId: base.data.projectId || undefined,
    dueDate: base.data.dueDate ? new Date(base.data.dueDate) : undefined,
    tax: base.data.tax,
    discount: base.data.discount,
    items,
  });

  if ("error" in result) redirect(`/${locale}/invoices/new?error=${result.error}`);

  revalidatePath(`/${locale}/invoices`);
  redirect(`/${locale}/invoices/${result.id}`);
}

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CARD", "CHEQUE", "OTHER"]),
  reference: z.string().optional(),
});

export async function recordPaymentAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "invoice:manage");

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/invoices?error=validation`);

  await recordPayment(ctx, {
    invoiceId: parsed.data.invoiceId,
    amount: parsed.data.amount,
    method: parsed.data.method,
    reference: parsed.data.reference,
  });

  revalidatePath(`/${locale}/invoices/${parsed.data.invoiceId}`);
}

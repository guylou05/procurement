"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { createPayrollEntry, markPayrollPaid } from "@/server/services/payroll";
import { recordAudit } from "@/server/audit";

const METHODS = ["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CARD", "CHEQUE", "OTHER"] as const;

const createSchema = z.object({
  workerId: z.string().min(1),
  periodLabel: z.string().min(1),
  gross: z.coerce.number().min(0).optional(),
  deductions: z.coerce.number().min(0).optional(),
  method: z.enum(METHODS).optional(),
  note: z.string().optional(),
});

export async function createPayrollAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "finance:view");
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/payroll?error=validation`);

  const entry = await createPayrollEntry(ctx, {
    workerId: parsed.data.workerId,
    periodLabel: parsed.data.periodLabel,
    gross: parsed.data.gross,
    deductions: parsed.data.deductions,
    method: parsed.data.method,
    note: parsed.data.note,
  });
  await recordAudit(ctx, { action: "payroll.create", recordType: "PayrollEntry", recordId: entry.id });
  revalidatePath(`/${locale}/payroll`);
}

const paidSchema = z.object({ id: z.string().min(1), method: z.enum(METHODS).optional() });

export async function markPaidAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "finance:view");
  const parsed = paidSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await markPayrollPaid(ctx, parsed.data.id, parsed.data.method);
  await recordAudit(ctx, { action: "payroll.paid", recordType: "PayrollEntry", recordId: parsed.data.id });
  revalidatePath(`/${locale}/payroll`);
}

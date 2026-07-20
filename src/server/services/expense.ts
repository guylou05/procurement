import type { PaymentMethod, ExpenseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { toMinor } from "@/lib/money";
import { recordAudit } from "@/server/audit";
import { uploadAttachment } from "@/server/services/attachment";

/** Expense service — tenant-scoped, with configurable approval thresholds and audit. */

export async function listExpenses(ctx: TenantContext) {
  return prisma.expense.findMany({
    where: { organizationId: ctx.organizationId },
    include: { project: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 100,
  });
}

export async function createExpense(
  ctx: TenantContext,
  input: {
    projectId?: string;
    amount: number;
    vendor?: string;
    date: Date;
    paymentMethod: PaymentMethod;
    description?: string;
    submit: boolean;
  },
) {
  const currency = ctx.organization.currency;

  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!project) throw new Error("Project not found in organization");
  }

  const amountMinor = toMinor(input.amount, currency);

  // Below the org's approval threshold, a submitted expense is auto-approved.
  const settings = await prisma.organizationSetting.findUnique({
    where: { organizationId: ctx.organizationId },
    select: { expenseApprovalThreshold: true },
  });
  const threshold = settings?.expenseApprovalThreshold ?? 0;

  let status: ExpenseStatus = "DRAFT";
  if (input.submit) {
    status = threshold > 0 && amountMinor <= threshold ? "APPROVED" : "SUBMITTED";
  }

  return prisma.expense.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: input.projectId || null,
      amountMinor,
      currency,
      vendor: input.vendor,
      date: input.date,
      paymentMethod: input.paymentMethod,
      description: input.description,
      submittedById: ctx.userId,
      status,
      approvedById: status === "APPROVED" ? ctx.userId : null,
      approvedAt: status === "APPROVED" ? new Date() : null,
    },
  });
}

/** Full expense for the detail view, with resolved submitter / approver names. */
export async function getExpenseDetail(ctx: TenantContext, id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      project: { select: { id: true, name: true } },
      category: { select: { name: true } },
    },
  });
  if (!expense) return null;

  const ids = [expense.submittedById, expense.approvedById].filter(Boolean) as string[];
  const people = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
    : [];
  const name = new Map(people.map((p) => [p.id, p.name ?? p.email]));

  return {
    expense,
    submittedByName: expense.submittedById ? name.get(expense.submittedById) ?? null : null,
    approvedByName: expense.approvedById ? name.get(expense.approvedById) ?? null : null,
  };
}

/** Submits a DRAFT expense (auto-approves below the org threshold). */
export async function submitDraftExpense(ctx: TenantContext, id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, organizationId: ctx.organizationId, status: "DRAFT" },
    select: { id: true, amountMinor: true },
  });
  if (!expense) throw new Error("Draft expense not found in organization");

  const settings = await prisma.organizationSetting.findUnique({
    where: { organizationId: ctx.organizationId },
    select: { expenseApprovalThreshold: true },
  });
  const threshold = settings?.expenseApprovalThreshold ?? 0;
  const autoApprove = threshold > 0 && expense.amountMinor <= threshold;
  const status: ExpenseStatus = autoApprove ? "APPROVED" : "SUBMITTED";

  await prisma.expense.update({
    where: { id },
    data: {
      status,
      approvedById: autoApprove ? ctx.userId : null,
      approvedAt: autoApprove ? new Date() : null,
    },
  });
  await recordAudit(ctx, { action: "expense.submit", recordType: "Expense", recordId: id, newValue: { status } });
}

/** Marks an APPROVED expense as reimbursed. */
export async function markExpenseReimbursed(ctx: TenantContext, id: string) {
  const result = await prisma.expense.updateMany({
    where: { id, organizationId: ctx.organizationId, status: "APPROVED" },
    data: { status: "REIMBURSED" },
  });
  if (result.count === 0) throw new Error("Approved expense not found in organization");
  await recordAudit(ctx, { action: "expense.reimburse", recordType: "Expense", recordId: id, newValue: { status: "REIMBURSED" } });
}

/** Uploads and attaches a receipt image/PDF to an expense (served via /api/files). */
export async function attachReceipt(ctx: TenantContext, id: string, file: File) {
  const expense = await prisma.expense.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!expense) throw new Error("Expense not found in organization");
  const attachment = await uploadAttachment(ctx, file);
  await prisma.expense.update({
    where: { id },
    data: { receiptUrl: `/api/files/${attachment.id}` },
  });
}

export async function decideExpense(
  ctx: TenantContext,
  id: string,
  decision: { approve: boolean; rejectionReason?: string },
) {
  const expense = await prisma.expense.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, status: true, amountMinor: true },
  });
  if (!expense) throw new Error("Expense not found in organization");

  const status: ExpenseStatus = decision.approve ? "APPROVED" : "REJECTED";
  await prisma.expense.update({
    where: { id },
    data: {
      status,
      approvedById: decision.approve ? ctx.userId : null,
      approvedAt: decision.approve ? new Date() : null,
      rejectionReason: decision.approve ? null : decision.rejectionReason,
    },
  });

  await recordAudit(ctx, {
    action: decision.approve ? "expense.approve" : "expense.reject",
    recordType: "Expense",
    recordId: id,
    previousValue: { status: expense.status },
    newValue: { status },
  });
}

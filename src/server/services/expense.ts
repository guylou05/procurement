import type { PaymentMethod, ExpenseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { toMinor } from "@/lib/money";
import { recordAudit } from "@/server/audit";

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

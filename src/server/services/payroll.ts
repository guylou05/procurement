import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { toMinor } from "@/lib/money";

/** Payroll service — tenant-scoped. Tracks staff income and payment status. */

export async function listPayroll(ctx: TenantContext) {
  return prisma.payrollEntry.findMany({
    where: { organizationId: ctx.organizationId },
    include: { worker: { select: { id: true, fullName: true, workerId: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 500,
  });
}

export async function payrollSummary(ctx: TenantContext) {
  const [paid, pending] = await Promise.all([
    prisma.payrollEntry.aggregate({
      where: { organizationId: ctx.organizationId, status: "PAID" },
      _sum: { netMinor: true },
      _count: true,
    }),
    prisma.payrollEntry.aggregate({
      where: { organizationId: ctx.organizationId, status: "PENDING" },
      _sum: { netMinor: true },
      _count: true,
    }),
  ]);
  return {
    paidMinor: paid._sum.netMinor ?? 0,
    paidCount: paid._count,
    pendingMinor: pending._sum.netMinor ?? 0,
    pendingCount: pending._count,
  };
}

/**
 * Estimated gross pay for a worker over a YYYY-MM period, from present-equivalent
 * attendance days × the worker's daily rate. Used to pre-fill a payroll entry.
 */
export async function estimateGross(ctx: TenantContext, workerId: string, periodLabel: string) {
  const worker = await prisma.worker.findFirst({
    where: { id: workerId, organizationId: ctx.organizationId, deletedAt: null },
    select: { dailyRateMinor: true },
  });
  if (!worker?.dailyRateMinor) return 0;

  const [year, month] = periodLabel.split("-").map(Number);
  if (!year || !month) return 0;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const records = await prisma.attendanceRecord.findMany({
    where: { workerId, organizationId: ctx.organizationId, date: { gte: start, lt: end } },
    select: { status: true },
  });
  const days = records.reduce((sum, r) => {
    if (r.status === "ABSENT") return sum;
    if (r.status === "HALF_DAY") return sum + 0.5;
    return sum + 1;
  }, 0);
  return Math.round(days * worker.dailyRateMinor);
}

export async function createPayrollEntry(
  ctx: TenantContext,
  input: {
    workerId: string;
    periodLabel: string;
    gross?: number;
    deductions?: number;
    method?: PaymentMethod;
    note?: string;
  },
) {
  const worker = await prisma.worker.findFirst({
    where: { id: input.workerId, organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!worker) throw new Error("Worker not found in organization");

  const currency = ctx.organization.currency;
  // If gross isn't supplied, derive it from attendance × rate for the period.
  const grossMinor =
    input.gross != null ? toMinor(input.gross, currency) : await estimateGross(ctx, input.workerId, input.periodLabel);
  const deductionsMinor = input.deductions != null ? toMinor(input.deductions, currency) : 0;

  return prisma.payrollEntry.create({
    data: {
      organizationId: ctx.organizationId,
      workerId: input.workerId,
      periodLabel: input.periodLabel.trim(),
      grossMinor,
      deductionsMinor,
      netMinor: Math.max(0, grossMinor - deductionsMinor),
      currency,
      method: input.method,
      note: input.note,
      createdById: ctx.userId,
    },
  });
}

export async function markPayrollPaid(ctx: TenantContext, id: string, method?: PaymentMethod) {
  const result = await prisma.payrollEntry.updateMany({
    where: { id, organizationId: ctx.organizationId, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date(), ...(method ? { method } : {}) },
  });
  if (result.count === 0) throw new Error("Pending payroll entry not found");
}

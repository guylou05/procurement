import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { isLowStock } from "@/server/services/material";
import { toMajor } from "@/lib/money";

/** Reporting & export service — tenant-scoped read models. */

export async function reportSummary(ctx: TenantContext) {
  const org = ctx.organizationId;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [attendanceTotal, presentToday, approvedAgg, pendingCount, materials] = await Promise.all([
    prisma.attendanceRecord.count({ where: { organizationId: org } }),
    prisma.attendanceRecord.count({
      where: {
        organizationId: org,
        date: { gte: startOfDay },
        status: { in: ["PRESENT", "LATE", "OVERTIME", "HALF_DAY"] },
      },
    }),
    prisma.expense.aggregate({
      where: { organizationId: org, status: "APPROVED" },
      _sum: { amountMinor: true },
    }),
    prisma.expense.count({ where: { organizationId: org, status: "SUBMITTED" } }),
    prisma.material.findMany({
      where: { organizationId: org, deletedAt: null },
      select: { quantity: true, minQuantity: true, unitCostMinor: true },
    }),
  ]);

  const lowStock = materials.filter(isLowStock).length;
  const inventoryValueMinor = materials.reduce(
    (sum, m) => sum + Math.round(m.quantity * m.unitCostMinor),
    0,
  );

  return {
    attendanceTotal,
    presentToday,
    approvedExpensesMinor: approvedAgg._sum.amountMinor ?? 0,
    pendingExpenses: pendingCount,
    lowStockItems: lowStock,
    inventoryValueMinor,
  };
}

/** Builds CSV rows for a given export type. Returns headers + rows of strings. */
export async function buildExport(
  ctx: TenantContext,
  type: "attendance" | "expenses" | "materials",
): Promise<{ filename: string; headers: string[]; rows: string[][] }> {
  const org = ctx.organizationId;

  if (type === "attendance") {
    const records = await prisma.attendanceRecord.findMany({
      where: { organizationId: org },
      include: { worker: { select: { fullName: true, workerId: true } }, project: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 5000,
    });
    return {
      filename: "attendance.csv",
      headers: ["Date", "Worker", "WorkerID", "Project", "Status", "CheckIn", "CheckOut"],
      rows: records.map((r) => [
        r.date.toISOString().slice(0, 10),
        r.worker.fullName,
        r.worker.workerId,
        r.project.name,
        r.status,
        r.checkInAt?.toISOString() ?? "",
        r.checkOutAt?.toISOString() ?? "",
      ]),
    };
  }

  if (type === "expenses") {
    const records = await prisma.expense.findMany({
      where: { organizationId: org },
      include: { project: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 5000,
    });
    return {
      filename: "expenses.csv",
      headers: ["Date", "Vendor", "Project", "Amount", "Currency", "Method", "Status"],
      rows: records.map((e) => [
        e.date.toISOString().slice(0, 10),
        e.vendor ?? "",
        e.project?.name ?? "",
        String(toMajor(e.amountMinor, e.currency)),
        e.currency,
        e.paymentMethod,
        e.status,
      ]),
    };
  }

  // materials
  const records = await prisma.material.findMany({
    where: { organizationId: org, deletedAt: null },
    orderBy: { name: "asc" },
    take: 5000,
  });
  return {
    filename: "materials.csv",
    headers: ["Name", "SKU", "Unit", "Quantity", "MinQuantity", "UnitCost", "Currency", "Supplier"],
    rows: records.map((m) => [
      m.name,
      m.sku ?? "",
      m.unit,
      String(m.quantity),
      String(m.minQuantity),
      String(toMajor(m.unitCostMinor, m.currency ?? ctx.organization.currency)),
      m.currency ?? ctx.organization.currency,
      m.supplier ?? "",
    ]),
  };
}

/** Serializes rows to RFC-4180-ish CSV. */
export function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}

import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { recordAudit } from "@/server/audit";

export async function listClients(ctx: TenantContext) {
  return prisma.client.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function getClient(ctx: TenantContext, id: string) {
  return prisma.client.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
  });
}

/**
 * Client profile hub: contact details, their projects and invoices, plus billing
 * totals (invoiced / paid / outstanding). Invoice totals are computed from line items
 * (+ tax − discount) and "paid" from linked payments. All tenant-scoped.
 */
export async function getClientHub(ctx: TenantContext, id: string) {
  const client = await prisma.client.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      projects: {
        where: { deletedAt: null },
        select: { id: true, name: true, status: true, completionPercentage: true },
        orderBy: { updatedAt: "desc" },
      },
      invoices: {
        include: { items: true, payments: { select: { amountMinor: true } } },
        orderBy: { issueDate: "desc" },
      },
    },
  });
  if (!client) return null;

  const invoices = client.invoices.map((inv) => {
    const subtotal = inv.items.reduce((s, it) => s + Math.round(it.quantity * it.unitPriceMinor), 0);
    const totalMinor = subtotal + inv.taxMinor - inv.discountMinor;
    const paidMinor = inv.payments.reduce((s, p) => s + p.amountMinor, 0);
    return {
      id: inv.id,
      number: inv.number,
      status: inv.status,
      issueDate: inv.issueDate,
      currency: inv.currency,
      totalMinor,
      paidMinor,
    };
  });

  // Billing figures exclude DRAFT and CANCELLED invoices (not real receivables).
  const billable = invoices.filter((i) => i.status !== "DRAFT" && i.status !== "CANCELLED");
  const totalInvoicedMinor = billable.reduce((s, i) => s + i.totalMinor, 0);
  const totalPaidMinor = billable.reduce((s, i) => s + i.paidMinor, 0);

  return {
    client,
    projects: client.projects,
    invoices,
    currency: ctx.organization.currency,
    stats: {
      projectCount: client.projects.length,
      totalInvoicedMinor,
      totalPaidMinor,
      outstandingMinor: totalInvoicedMinor - totalPaidMinor,
    },
  };
}

export async function updateClient(
  ctx: TenantContext,
  id: string,
  input: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    billingAddress?: string;
    notes?: string;
  },
) {
  const result = await prisma.client.updateMany({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    data: {
      name: input.name.trim(),
      company: input.company,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
      billingAddress: input.billingAddress,
      notes: input.notes,
    },
  });
  if (result.count === 0) throw new Error("Client not found in organization");
  await recordAudit(ctx, { action: "client.update", recordType: "Client", recordId: id });
}

export async function createClient(
  ctx: TenantContext,
  input: { name: string; company?: string; email?: string; phone?: string; whatsapp?: string },
) {
  return prisma.client.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name.trim(),
      company: input.company,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
    },
  });
}

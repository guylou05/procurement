import type { PaymentMethod, InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { toMinor, invoiceTotalMinor } from "@/lib/money";
import { recordAudit } from "@/server/audit";

/**
 * Invoice & payment service — tenant-scoped. Payments are recorded manually in the
 * MVP; the `method` field maps to the PaymentMethod enum and a future payment-provider
 * adapter (Orange/MTN/Wave/M-Pesa/Stripe/Paystack/Flutterwave) can settle them.
 */

export interface InvoiceListRow {
  id: string;
  number: string;
  status: InvoiceStatus;
  currency: string;
  issueDate: Date;
  dueDate: Date | null;
  clientName: string | null;
  totalMinor: number;
  paidMinor: number;
}

export async function listInvoices(ctx: TenantContext): Promise<InvoiceListRow[]> {
  const invoices = await prisma.invoice.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      client: { select: { name: true } },
      items: { select: { quantity: true, unitPriceMinor: true } },
      payments: { select: { amountMinor: true } },
    },
    orderBy: { issueDate: "desc" },
    take: 100,
  });

  return invoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    status: inv.status,
    currency: inv.currency,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    clientName: inv.client?.name ?? null,
    totalMinor: invoiceTotalMinor(inv.items, inv.taxMinor, inv.discountMinor),
    paidMinor: inv.payments.reduce((s, p) => s + p.amountMinor, 0),
  }));
}

export async function getInvoice(ctx: TenantContext, id: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      client: true,
      project: { select: { name: true } },
      items: { orderBy: { order: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) return null;

  const totalMinor = invoiceTotalMinor(invoice.items, invoice.taxMinor, invoice.discountMinor);
  const paidMinor = invoice.payments.reduce((s, p) => s + p.amountMinor, 0);
  return { invoice, totalMinor, paidMinor, balanceMinor: totalMinor - paidMinor };
}

export async function createInvoice(
  ctx: TenantContext,
  input: {
    number: string;
    clientId?: string;
    projectId?: string;
    dueDate?: Date;
    tax?: number;
    discount?: number;
    items: { description: string; quantity: number; unitPrice: number }[];
  },
): Promise<{ id: string } | { error: "NUMBER_TAKEN" | "NO_ITEMS" }> {
  const currency = ctx.organization.currency;
  const items = input.items.filter((i) => i.description.trim() && i.quantity > 0);
  if (items.length === 0) return { error: "NO_ITEMS" };

  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!client) throw new Error("Client not found in organization");
  }

  const existing = await prisma.invoice.findUnique({
    where: { organizationId_number: { organizationId: ctx.organizationId, number: input.number } },
    select: { id: true },
  });
  if (existing) return { error: "NUMBER_TAKEN" };

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: ctx.organizationId,
      number: input.number.trim(),
      clientId: input.clientId || null,
      projectId: input.projectId || null,
      currency,
      dueDate: input.dueDate,
      taxMinor: input.tax ? toMinor(input.tax, currency) : 0,
      discountMinor: input.discount ? toMinor(input.discount, currency) : 0,
      status: "DRAFT",
      items: {
        create: items.map((i, idx) => ({
          description: i.description.trim(),
          quantity: i.quantity,
          unitPriceMinor: toMinor(i.unitPrice, currency),
          order: idx,
        })),
      },
    },
  });
  return { id: invoice.id };
}

export async function setInvoiceStatus(ctx: TenantContext, id: string, status: InvoiceStatus) {
  const result = await prisma.invoice.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: { status },
  });
  if (result.count === 0) throw new Error("Invoice not found in organization");
}

export async function recordPayment(
  ctx: TenantContext,
  input: { invoiceId: string; amount: number; method: PaymentMethod; reference?: string },
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, organizationId: ctx.organizationId },
    include: {
      items: { select: { quantity: true, unitPriceMinor: true } },
      payments: { select: { amountMinor: true } },
    },
  });
  if (!invoice) throw new Error("Invoice not found in organization");

  const currency = invoice.currency;
  const amountMinor = toMinor(input.amount, currency);
  const totalMinor = invoiceTotalMinor(invoice.items, invoice.taxMinor, invoice.discountMinor);
  const paidBefore = invoice.payments.reduce((s, p) => s + p.amountMinor, 0);
  const paidAfter = paidBefore + amountMinor;

  const status: InvoiceStatus =
    paidAfter >= totalMinor ? "PAID" : paidAfter > 0 ? "PARTIALLY_PAID" : invoice.status;

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        organizationId: ctx.organizationId,
        invoiceId: input.invoiceId,
        amountMinor,
        currency,
        method: input.method,
        reference: input.reference,
      },
    }),
    prisma.invoice.update({ where: { id: input.invoiceId }, data: { status } }),
  ]);

  await recordAudit(ctx, {
    action: "payment.record",
    recordType: "Invoice",
    recordId: input.invoiceId,
    newValue: { amountMinor, method: input.method, status },
  });
}

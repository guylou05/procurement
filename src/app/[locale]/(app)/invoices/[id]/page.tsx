import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, can } from "@/server/authz";
import { getInvoice } from "@/server/services/invoice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { recordPaymentAction } from "../actions";

const METHODS = ["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CARD", "CHEQUE", "OTHER"] as const;

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("invoice");
  const ts = await getTranslations("invoice.statuses");
  const tm = await getTranslations("expense.methods");
  const data = await getInvoice(ctx, id);
  if (!data) notFound();
  const { invoice, totalMinor, paidMinor, balanceMinor } = data;
  const cur = invoice.currency;
  const pay = recordPaymentAction.bind(null, locale);
  const canManage = can(ctx, "invoice:manage");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {t("number")} {invoice.number}
          </h1>
          <p className="text-sm text-muted-foreground">
            {invoice.client?.name ?? "—"}
            {invoice.project ? ` · ${invoice.project.name}` : ""}
          </p>
        </div>
        <StatusBadge status={invoice.status} label={ts(invoice.status)} />
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">{t("lineItem")}</th>
                  <th className="py-2 text-right font-medium">{t("quantity")}</th>
                  <th className="py-2 text-right font-medium">{t("unitPrice")}</th>
                  <th className="py-2 text-right font-medium">{t("total")}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="py-2">{it.description}</td>
                    <td className="py-2 text-right">{it.quantity}</td>
                    <td className="py-2 text-right">{formatMoney(it.unitPriceMinor, cur, locale)}</td>
                    <td className="py-2 text-right">
                      {formatMoney(Math.round(it.quantity * it.unitPriceMinor), cur, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 space-y-1 text-sm sm:ml-auto sm:w-64">
            {invoice.taxMinor > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("tax")}</dt>
                <dd>{formatMoney(invoice.taxMinor, cur, locale)}</dd>
              </div>
            ) : null}
            {invoice.discountMinor > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("discount")}</dt>
                <dd>−{formatMoney(invoice.discountMinor, cur, locale)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between font-semibold">
              <dt>{t("total")}</dt>
              <dd>{formatMoney(totalMinor, cur, locale)}</dd>
            </div>
            <div className="flex justify-between text-success">
              <dt>{t("paid")}</dt>
              <dd>{formatMoney(paidMinor, cur, locale)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>{t("balance")}</dt>
              <dd>{formatMoney(balanceMinor, cur, locale)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {invoice.payments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("paid")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatDate(p.paidAt, locale)} · {tm(p.method)}
                </span>
                <span className="font-medium">{formatMoney(p.amountMinor, cur, locale)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {canManage && balanceMinor > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("recordPayment")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={pay} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <div>
                <Label htmlFor="amount">
                  {t("amount")} ({cur})
                </Label>
                <Input id="amount" name="amount" type="number" min="0" step="any" required className="w-40" />
              </div>
              <div>
                <Label htmlFor="method">{t("method")}</Label>
                <select
                  id="method"
                  name="method"
                  className="flex h-11 rounded-md border border-input bg-background px-3 text-base"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {tm(m)}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">{t("recordPayment")}</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

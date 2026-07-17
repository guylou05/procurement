import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { listInvoices } from "@/server/services/invoice";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("invoice");
  const ts = await getTranslations("invoice.statuses");
  const invoices = await listInvoices(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {can(ctx, "invoice:manage") ? (
          <Button asChild>
            <Link href="/invoices/new">
              <Plus className="size-4" />
              {t("new")}
            </Link>
          </Button>
        ) : null}
      </div>

      {invoices.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("number")}</th>
                  <th className="px-4 py-3 font-medium">{t("client")}</th>
                  <th className="px-4 py-3 font-medium">{t("dueDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("total")}</th>
                  <th className="px-4 py-3 font-medium">{t("paid")}</th>
                  <th className="px-4 py-3 font-medium">{t("statuses.SENT")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.clientName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.dueDate, locale)}</td>
                    <td className="px-4 py-3">{formatMoney(inv.totalMinor, inv.currency, locale)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatMoney(inv.paidMinor, inv.currency, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} label={ts(inv.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

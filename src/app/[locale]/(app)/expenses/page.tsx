import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { listExpenses } from "@/server/services/expense";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Plus, Check, X } from "lucide-react";
import { decideExpenseAction } from "./actions";

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("expense");
  const ts = await getTranslations("expense.statuses");
  const tm = await getTranslations("expense.methods");
  const expenses = await listExpenses(ctx);
  const decide = decideExpenseAction.bind(null, locale);
  const canApprove = can(ctx, "expense:approve");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {can(ctx, "expense:record") ? (
          <Button asChild>
            <Link href="/expenses/new">
              <Plus className="size-4" />
              {t("new")}
            </Link>
          </Button>
        ) : null}
      </div>

      {expenses.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("date")}</th>
                  <th className="px-4 py-3 font-medium">{t("vendor")}</th>
                  <th className="px-4 py-3 font-medium">{t("project")}</th>
                  <th className="px-4 py-3 font-medium">{t("amount")}</th>
                  <th className="px-4 py-3 font-medium">{t("paymentMethod")}</th>
                  <th className="px-4 py-3 font-medium">{t("statuses.SUBMITTED")}</th>
                  {canApprove ? <th className="px-4 py-3 font-medium"></th> : null}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/expenses/${e.id}`} className="hover:underline">
                        {formatDate(e.date, locale)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/expenses/${e.id}`} className="hover:underline">
                        {e.vendor ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{e.project?.name ?? "—"}</td>
                    <td className="px-4 py-3">{formatMoney(e.amountMinor, e.currency, locale)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tm(e.paymentMethod)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} label={ts(e.status)} />
                    </td>
                    {canApprove ? (
                      <td className="px-4 py-3">
                        {e.status === "SUBMITTED" ? (
                          <div className="flex gap-1">
                            <form action={decide}>
                              <input type="hidden" name="id" value={e.id} />
                              <input type="hidden" name="approve" value="true" />
                              <Button type="submit" size="icon" variant="outline" title={t("approve")}>
                                <Check className="size-4 text-success" />
                              </Button>
                            </form>
                            <form action={decide}>
                              <input type="hidden" name="id" value={e.id} />
                              <input type="hidden" name="approve" value="false" />
                              <Button type="submit" size="icon" variant="outline" title={t("reject")}>
                                <X className="size-4 text-destructive" />
                              </Button>
                            </form>
                          </div>
                        ) : null}
                      </td>
                    ) : null}
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

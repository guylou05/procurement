import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireAuth, can } from "@/server/authz";
import { listPayroll, payrollSummary } from "@/server/services/payroll";
import { listWorkers } from "@/server/services/worker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Wallet, Clock } from "lucide-react";
import { createPayrollAction, markPaidAction } from "./actions";

const METHODS = ["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CARD", "CHEQUE", "OTHER"] as const;

export default async function PayrollPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  if (!can(ctx, "finance:view")) redirect(`/${locale}/dashboard`);

  const t = await getTranslations("payroll");
  const tst = await getTranslations("payroll.statuses");
  const tm = await getTranslations("payroll.methods");
  const [entries, summary, workers] = await Promise.all([
    listPayroll(ctx),
    payrollSummary(ctx),
    listWorkers(ctx),
  ]);
  const cur = ctx.organization.currency;
  const create = createPayrollAction.bind(null, locale);
  const markPaid = markPaidAction.bind(null, locale);
  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t("totalPaid")}</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatMoney(summary.paidMinor, cur, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t("totalPending")}</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatMoney(summary.pendingMinor, cur, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t("pendingCount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{summary.pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("addEntry")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
            <div className="lg:col-span-2">
              <Label htmlFor="workerId">{t("worker")}</Label>
              <select id="workerId" name="workerId" required className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>{w.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="periodLabel">{t("period")}</Label>
              <Input id="periodLabel" name="periodLabel" type="month" defaultValue={thisMonth} required />
            </div>
            <div>
              <Label htmlFor="gross">{t("gross")}</Label>
              <Input id="gross" name="gross" type="number" min="0" step="1" placeholder="auto" title={t("grossHint")} />
            </div>
            <div>
              <Label htmlFor="deductions">{t("deductions")}</Label>
              <Input id="deductions" name="deductions" type="number" min="0" step="1" />
            </div>
            <Button type="submit">{t("record")}</Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">{t("grossHint")}</p>
        </CardContent>
      </Card>

      {/* Entries */}
      {entries.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("worker")}</th>
                  <th className="px-4 py-3 font-medium">{t("period")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("gross")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("deductions")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("net")}</th>
                  <th className="px-4 py-3 font-medium">{t("status")}</th>
                  <th className="px-4 py-3 font-medium">{t("paidAt")}</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{e.worker.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.periodLabel}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(e.grossMinor, e.currency, locale)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {e.deductionsMinor ? formatMoney(e.deductionsMinor, e.currency, locale) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(e.netMinor, e.currency, locale)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={e.status === "PAID" ? "success" : "warning"}>{tst(e.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.paidAt ? `${formatDate(e.paidAt, locale)}${e.method ? ` · ${tm(e.method)}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.status === "PENDING" ? (
                        <form action={markPaid} className="flex items-center justify-end gap-2">
                          <input type="hidden" name="id" value={e.id} />
                          <select name="method" defaultValue="MOBILE_MONEY" className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                            {METHODS.map((m) => (
                              <option key={m} value={m}>{tm(m)}</option>
                            ))}
                          </select>
                          <Button type="submit" size="sm" variant="outline">{t("markPaid")}</Button>
                        </form>
                      ) : null}
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

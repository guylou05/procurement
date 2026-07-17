import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { reportSummary } from "@/server/services/report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { Download, UserCheck, Receipt, Package } from "lucide-react";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("report");
  const s = await reportSummary(ctx);
  const cur = ctx.organization.currency;
  const canExport = can(ctx, "report:export");

  const stats = [
    { label: t("presentToday"), value: String(s.presentToday) },
    { label: t("approvedExpenses"), value: formatMoney(s.approvedExpensesMinor, cur, locale) },
    { label: t("pendingExpenses"), value: String(s.pendingExpenses) },
    { label: t("lowStockItems"), value: String(s.lowStockItems) },
    { label: t("inventoryValue"), value: formatMoney(s.inventoryValueMinor, cur, locale) },
  ];

  const exports = [
    { type: "attendance", label: t("attendance"), icon: UserCheck },
    { type: "expenses", label: t("expenses"), icon: Receipt },
    { type: "materials", label: t("materials"), icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((st) => (
          <Card key={st.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {st.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{st.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {canExport ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {exports.map((e) => {
            const Icon = e.icon;
            return (
              <Card key={e.type}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{e.label}</span>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    {/* Server route enforces auth + report:export + tenant scoping. */}
                    <a href={`/api/export/${e.type}`} download>
                      <Download className="size-4" />
                      {t("exportCsv")}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

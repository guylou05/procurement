import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { reportSummary, getTenantAnalytics } from "@/server/services/report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarList } from "@/components/charts/bar-list";
import { Link } from "@/i18n/routing";
import { formatMoney } from "@/lib/money";
import { Download, UserCheck, Receipt, Package } from "lucide-react";

// Period presets, each mapped to a number of weekly buckets.
const RANGES = [
  { key: "30d", weeks: 5 },
  { key: "90d", weeks: 13 },
  { key: "6m", weeks: 26 },
  { key: "12m", weeks: 52 },
] as const;
const DEFAULT_RANGE = "90d";

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale } = await params;
  const { range } = await searchParams;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("report");

  const active = RANGES.find((r) => r.key === range) ?? RANGES.find((r) => r.key === DEFAULT_RANGE)!;
  const [s, analytics] = await Promise.all([reportSummary(ctx), getTenantAnalytics(ctx, active.weeks)]);
  const cur = ctx.organization.currency;
  const canExport = can(ctx, "report:export");
  const money = (n: number) => formatMoney(n, cur, locale);
  const rangeLabel = t(`ranges.${active.key}`);
  // yyyy-mm-dd start of the window, threaded into drill-down links as `from`.
  const fromParam = analytics.since.toISOString().slice(0, 10);

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

      {/* Analytics */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {t("analytics")} <span className="text-sm font-normal text-muted-foreground">· {rangeLabel}</span>
          </h2>
          <div className="flex rounded-md border p-0.5">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/reports?range=${r.key}`}
                className={`rounded px-2.5 py-1 text-sm ${
                  r.key === active.key ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`ranges.${r.key}`)}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TrendChart data={analytics.spendTrend} title={t("spendTrend")} subtitle={rangeLabel} format={money} />
          <TrendChart
            data={analytics.attendanceTrend}
            title={t("attendanceTrend")}
            subtitle={rangeLabel}
            accent="hsl(var(--accent))"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("spendByCategory")}</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.expensesByCategory.length === 0 ? (
                <EmptyState title={t("noData")} />
              ) : (
                <BarList
                  items={analytics.expensesByCategory.map((c) => ({
                    label: c.name,
                    value: c.minor,
                    display: money(c.minor),
                    href: c.id ? `/expenses?category=${c.id}&from=${fromParam}` : undefined,
                  }))}
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("spendByProject")}</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.expensesByProject.length === 0 ? (
                <EmptyState title={t("noData")} />
              ) : (
                <BarList
                  items={analytics.expensesByProject.map((p) => ({
                    label: p.name,
                    value: p.minor,
                    display: money(p.minor),
                    href: `/expenses?project=${p.id}&from=${fromParam}`,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {analytics.budgetVsActual.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("budgetVsActual")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.budgetVsActual.map((p) => {
                const pct = p.budgetMinor > 0 ? Math.min(100, (p.spentMinor / p.budgetMinor) * 100) : 0;
                const over = p.spentMinor > p.budgetMinor && p.budgetMinor > 0;
                return (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground">
                        {money(p.spentMinor)} / {money(p.budgetMinor)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${over ? "bg-destructive" : "bg-success"}`}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}
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

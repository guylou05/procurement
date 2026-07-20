import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/server/authz";
import { getDashboardData, getDashboardFinancials } from "@/server/services/dashboard";
import { getTenantAnalytics } from "@/server/services/report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarList } from "@/components/charts/bar-list";
import { Link } from "@/i18n/routing";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import {
  FolderKanban,
  UserCheck,
  ClipboardList,
  AlertTriangle,
  Receipt,
  Clock,
  Wrench,
  Wallet,
  Package,
} from "lucide-react";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireAuth(locale);
  const t = await getTranslations("dashboard");
  const ts = await getTranslations("expense.statuses");
  const [data, fin, analytics] = await Promise.all([
    getDashboardData(ctx),
    getDashboardFinancials(ctx),
    getTenantAnalytics(ctx, 8),
  ]);

  const cur = ctx.organization.currency;
  const money = (n: number) => formatMoney(n, cur, locale);

  // Operational KPIs — attention cards highlight and link when action is needed.
  const kpis = [
    { label: t("activeProjects"), value: data.activeProjects, icon: FolderKanban, href: "/projects" },
    { label: t("workersOnSite"), value: data.workersOnSite, icon: UserCheck, href: "/attendance" },
    { label: t("pendingExpenses"), value: data.pendingExpenses, icon: Receipt, href: "/expenses", attention: true },
    { label: t("pendingReports"), value: data.pendingReports, icon: ClipboardList, href: "/daily-reports", attention: true },
    { label: t("openIssues"), value: data.openIssues, icon: AlertTriangle, href: "/issues", attention: true },
    { label: t("projectsBehind"), value: data.projectsBehind, icon: Clock, href: "/projects", attention: true },
    { label: t("maintenanceDue"), value: data.maintenanceDue, icon: Wrench, href: "/equipment", attention: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("welcome")}, {ctx.userName}
        </p>
      </div>

      {/* Financial summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label={t("spendThisMonth")}
          value={money(fin.spendThisMonthMinor)}
          icon={Wallet}
          deltaPct={fin.spendDeltaPct}
          deltaGoodWhenDown
          hint={t("vsLastMonth", { amount: money(fin.spendLastMonthMinor) })}
        />
        <StatCard
          label={t("awaitingReimbursement")}
          value={money(fin.pendingReimburseMinor)}
          icon={Receipt}
          href="/expenses"
        />
        <StatCard
          label={t("inventoryValue")}
          value={money(fin.inventoryValueMinor)}
          icon={Package}
          href="/materials"
        />
      </div>

      {/* Operational KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpis.map((c) => (
          <StatCard
            key={c.label}
            label={c.label}
            value={c.value}
            icon={c.icon}
            href={c.href}
            attention={c.attention}
          />
        ))}
      </div>

      {/* Trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart
          data={analytics.spendTrend}
          title={t("spendTrend")}
          subtitle={t("last8Weeks")}
          format={money}
        />
        <TrendChart
          data={analytics.attendanceTrend}
          title={t("attendanceTrend")}
          subtitle={t("last8Weeks")}
          accent="hsl(var(--accent))"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Budget vs actual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("budgetVsActual")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.budgetVsActual.length === 0 ? (
              <EmptyState title={t("noData")} />
            ) : (
              analytics.budgetVsActual.slice(0, 5).map((p) => {
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
              })
            )}
          </CardContent>
        </Card>

        {/* Spend by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("spendByCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.expensesByCategory.length === 0 ? (
              <EmptyState title={t("noData")} />
            ) : (
              <BarList
                items={analytics.expensesByCategory.slice(0, 6).map((c) => ({
                  label: c.name,
                  value: c.minor,
                  display: money(c.minor),
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("recentActivity")}</CardTitle>
          <Link href="/expenses" className="text-sm text-primary hover:underline">
            {t("viewAll")}
          </Link>
        </CardHeader>
        <CardContent>
          {fin.recentExpenses.length === 0 ? (
            <EmptyState title={t("noData")} />
          ) : (
            <ul className="divide-y">
              {fin.recentExpenses.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/expenses/${e.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{e.vendor ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.project?.name ?? t("noProject")} · {formatDate(e.date, locale)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-medium">{formatMoney(e.amountMinor, e.currency, locale)}</span>
                      <StatusBadge status={e.status} label={ts(e.status)} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import {
  getDashboardData,
  getDashboardFinancials,
  getMyWork,
} from "@/server/services/dashboard";
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
  CheckSquare,
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
  const tts = await getTranslations("task.statuses");

  // Role-aware: only fetch and show what the signed-in user is allowed to see.
  const canFinance = can(ctx, "finance:view");
  const canApproveExpenses = can(ctx, "expense:approve");
  const canReviewReports = can(ctx, "report:review");
  const canRecordAttendance = can(ctx, "attendance:record");
  const canManageEquipment = can(ctx, "equipment:manage");

  const [data, myWork, fin, analytics] = await Promise.all([
    getDashboardData(ctx),
    getMyWork(ctx),
    canFinance ? getDashboardFinancials(ctx) : Promise.resolve(null),
    canFinance ? getTenantAnalytics(ctx, 8) : Promise.resolve(null),
  ]);

  const cur = ctx.organization.currency;
  const money = (n: number) => formatMoney(n, cur, locale);

  // Operational KPIs, each gated to the permission that makes it relevant.
  const kpis = [
    { label: t("activeProjects"), value: data.activeProjects, icon: FolderKanban, href: "/projects", show: true },
    { label: t("workersOnSite"), value: data.workersOnSite, icon: UserCheck, href: "/attendance", show: canRecordAttendance },
    { label: t("pendingExpenses"), value: data.pendingExpenses, icon: Receipt, href: "/expenses", attention: true, show: canApproveExpenses },
    { label: t("pendingReports"), value: data.pendingReports, icon: ClipboardList, href: "/daily-reports", attention: true, show: canReviewReports },
    { label: t("openIssues"), value: data.openIssues, icon: AlertTriangle, href: "/issues", attention: true, show: true },
    { label: t("projectsBehind"), value: data.projectsBehind, icon: Clock, href: "/projects", attention: true, show: true },
    { label: t("maintenanceDue"), value: data.maintenanceDue, icon: Wrench, href: "/equipment", attention: true, show: canManageEquipment },
  ].filter((k) => k.show);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("welcome")}, {ctx.userName}
        </p>
      </div>

      {/* My work — personalized for every role */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {t("myTasks")}
            {myWork.openCount > 0 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">{myWork.openCount}</span>
            ) : null}
          </CardTitle>
          <Link href="/tasks" className="text-sm text-primary hover:underline">
            {t("viewAll")}
          </Link>
        </CardHeader>
        <CardContent>
          {myWork.tasks.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <CheckSquare className="size-4" />
              {t("noMyTasks")}
            </div>
          ) : (
            <ul className="divide-y">
              {myWork.tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{task.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {task.project?.name ?? t("noProject")}
                        {task.dueDate ? ` · ${formatDate(task.dueDate, locale)}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={task.status} label={tts(task.status)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Financial summary — finance:view only */}
      {fin ? (
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
      ) : null}

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
      {analytics ? (
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
      ) : null}

      {/* Budget + category — finance:view only */}
      {analytics ? (
        <div className="grid gap-4 lg:grid-cols-2">
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
      ) : null}

      {/* Recent activity — finance:view only */}
      {fin ? (
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
      ) : null}
    </div>
  );
}

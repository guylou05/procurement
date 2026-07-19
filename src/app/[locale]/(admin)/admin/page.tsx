import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/server/authz";
import {
  getPlatformStats,
  getPlatformTrends,
  getTopOrganizations,
  getSubscriptionSummary,
  listPlatformAuditLog,
} from "@/server/services/admin";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarList } from "@/components/charts/bar-list";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Building2, UserCog, FolderKanban, Ban, Sparkles, CreditCard } from "lucide-react";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin(locale);
  const t = await getTranslations("admin");

  const [stats, trends, topOrgs, subs, activity] = await Promise.all([
    getPlatformStats(),
    getPlatformTrends(8),
    getTopOrganizations(5),
    getSubscriptionSummary(),
    listPlatformAuditLog(12),
  ]);

  const cards = [
    { label: t("stats.organizations"), value: String(stats.organizations), icon: Building2 },
    { label: t("stats.users"), value: String(stats.users), icon: UserCog },
    { label: t("stats.projects"), value: String(stats.projects), icon: FolderKanban },
    { label: t("stats.suspended"), value: String(stats.suspendedOrganizations), icon: Ban },
    { label: t("kpi.activeSubs"), value: String(subs.activeSubscriptions), icon: CreditCard },
    { label: t("stats.newOrganizations"), value: String(stats.newOrganizations), icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/audit-log">{t("viewAuditLog")}</Link>
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trend charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <TrendChart data={trends.organizations} title={t("kpi.signupsTrend")} subtitle={t("kpi.last8Weeks")} />
        <TrendChart data={trends.users} title={t("kpi.usersTrend")} subtitle={t("kpi.last8Weeks")} accent="hsl(var(--accent))" />
        <TrendChart data={trends.projects} title={t("kpi.projectsTrend")} subtitle={t("kpi.last8Weeks")} accent="hsl(var(--success))" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top organizations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("kpi.topOrgs")}</CardTitle>
          </CardHeader>
          <CardContent>
            {topOrgs.length === 0 ? (
              <EmptyState title={t("emptyOrgs")} />
            ) : (
              <BarList
                items={topOrgs.map((o) => ({
                  label: o.name,
                  value: o._count.projects,
                  hint: t("kpi.byProjects"),
                  href: `/${locale}/admin/organizations/${o.id}`,
                }))}
              />
            )}
          </CardContent>
        </Card>

        {/* Recent platform activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState title={t("activityEmpty")} />
            ) : (
              <div className="space-y-3">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <span className="font-medium">{a.action}</span>
                      <span className="ml-2 text-muted-foreground">
                        {a.organization?.name ?? "—"}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(a.createdAt, locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {subs.activeSubscriptions > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("kpi.mrr")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatMoney(subs.mrrMinor, subs.currency, locale)}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

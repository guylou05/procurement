import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/server/authz";
import { getPlatformStats, listPlatformAuditLog } from "@/server/services/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { Building2, UserCog, FolderKanban, Ban, Sparkles } from "lucide-react";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin(locale);
  const t = await getTranslations("admin");

  const [stats, activity] = await Promise.all([
    getPlatformStats(),
    listPlatformAuditLog(15),
  ]);

  const cards = [
    { label: t("stats.organizations"), value: stats.organizations, icon: Building2 },
    { label: t("stats.suspended"), value: stats.suspendedOrganizations, icon: Ban },
    { label: t("stats.users"), value: stats.users, icon: UserCog },
    { label: t("stats.projects"), value: stats.projects, icon: FolderKanban },
    { label: t("stats.newOrganizations"), value: stats.newOrganizations, icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                      {a.user ? ` · ${a.user.name ?? a.user.email}` : ""}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(a.createdAt, locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

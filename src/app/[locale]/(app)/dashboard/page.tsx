import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/server/authz";
import { getDashboardData } from "@/server/services/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, UserCheck, ClipboardList, AlertTriangle, Receipt, Clock, Wrench } from "lucide-react";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let ctx, t, data;
  try {
    ctx = await requireAuth(locale);
    t = await getTranslations("dashboard");
    data = await getDashboardData(ctx);
  } catch (err) {
    console.error("[DashboardPage] failed:", err);
    throw err;
  }

  const cards = [
    { label: t("activeProjects"), value: data.activeProjects, icon: FolderKanban },
    { label: t("workersOnSite"), value: data.workersOnSite, icon: UserCheck },
    { label: t("pendingReports"), value: data.pendingReports, icon: ClipboardList },
    { label: t("openIssues"), value: data.openIssues, icon: AlertTriangle },
    { label: t("pendingExpenses"), value: data.pendingExpenses, icon: Receipt },
    { label: t("projectsBehind"), value: data.projectsBehind, icon: Clock },
    { label: t("maintenanceDue"), value: data.maintenanceDue, icon: Wrench },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("welcome")}, {ctx.userName}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

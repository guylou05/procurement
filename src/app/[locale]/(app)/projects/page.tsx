import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/server/authz";
import { can } from "@/server/authz";
import { listProjects } from "@/server/services/project";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("project");
  const tp = await getTranslations("project.statuses");
  const projects = await listProjects(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {can(ctx, "project:create") ? (
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="size-4" />
              {t("new")}
            </Link>
          </Button>
        ) : null}
      </div>

      {projects.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("name")}</th>
                  <th className="px-4 py-3 font-medium">{t("code")}</th>
                  <th className="px-4 py-3 font-medium">{t("client")}</th>
                  <th className="px-4 py-3 font-medium">{t("status")}</th>
                  <th className="px-4 py-3 font-medium">{t("budget")}</th>
                  <th className="px-4 py-3 font-medium">{t("endDate")}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/projects/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.client?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} label={tp(p.status)} />
                    </td>
                    <td className="px-4 py-3">
                      {formatMoney(p.budgetMinor, p.currency ?? ctx.organization.currency, locale)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(p.expectedEndDate, locale)}
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

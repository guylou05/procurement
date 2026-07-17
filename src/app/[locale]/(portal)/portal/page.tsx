import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/server/authz";
import { listPortalProjects } from "@/server/services/portal";
import { Link } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export default async function PortalHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("portal");
  const tp = await getTranslations("project.statuses");
  const { client, projects } = await listPortalProjects(ctx);

  if (!client) {
    return <EmptyState title={t("noAccess")} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("myProjects")}</h1>
        <p className="text-sm text-muted-foreground">{client.name}</p>
      </div>

      {projects.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/portal/${p.id}`}>
              <Card className="transition-colors hover:bg-muted/40">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.city ?? ""}
                      {p.expectedEndDate ? ` · ${formatDate(p.expectedEndDate, locale)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <StatusBadge status={p.status} label={tp(p.status)} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.completionPercentage}%
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

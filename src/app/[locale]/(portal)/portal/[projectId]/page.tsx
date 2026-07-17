import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth } from "@/server/authz";
import { getPortalProject } from "@/server/services/portal";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, CheckCircle2, Circle } from "lucide-react";

export default async function PortalProjectPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("portal");
  const tp = await getTranslations("project.statuses");
  const ti = await getTranslations("invoice.statuses");
  const data = await getPortalProject(ctx, projectId);
  if (!data) notFound();
  const { project, invoices } = data;

  return (
    <div className="space-y-6">
      <Link
        href="/portal"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t("backToProjects")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <StatusBadge status={project.status} label={tp(project.status)} />
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("progress")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatDate(project.startDate, locale)} — {formatDate(project.expectedEndDate, locale)}
            </span>
            <span className="font-semibold">{project.completionPercentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${project.completionPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      {project.milestones.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("milestones")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-3 text-sm">
                {m.completion >= 100 ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1">{m.name}</span>
                <span className="text-muted-foreground">{m.completion}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Invoices */}
      {invoices.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("invoices")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">
                    {t("invoiceNumber")} {inv.number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("dueDate")}: {formatDate(inv.dueDate, locale)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatMoney(inv.totalMinor, inv.currency, locale)}</p>
                  <StatusBadge status={inv.status} label={ti(inv.status)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

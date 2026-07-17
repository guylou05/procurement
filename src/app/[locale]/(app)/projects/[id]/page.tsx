import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth } from "@/server/authz";
import { getProject } from "@/server/services/project";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("project");
  const tp = await getTranslations("project.statuses");
  const project = await getProject(ctx, id);
  if (!project) notFound();

  const rows = [
    { label: t("code"), value: project.code },
    { label: t("client"), value: project.client?.name ?? "—" },
    { label: t("city"), value: project.city ?? "—" },
    {
      label: t("budget"),
      value: formatMoney(project.budgetMinor, project.currency ?? ctx.organization.currency, locale),
    },
    { label: t("startDate"), value: formatDate(project.startDate, locale) },
    { label: t("endDate"), value: formatDate(project.expectedEndDate, locale) },
    { label: t("completion"), value: `${project.completionPercentage}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
          ) : null}
        </div>
        <StatusBadge status={project.status} label={tp(project.status)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <div key={r.label}>
                <dt className="text-xs font-medium uppercase text-muted-foreground">{r.label}</dt>
                <dd className="mt-0.5 text-sm">{r.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

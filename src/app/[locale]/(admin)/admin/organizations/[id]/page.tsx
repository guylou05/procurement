import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/server/authz";
import { getOrganizationForAdmin } from "@/server/services/admin";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { getCountry } from "@/config/countries";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, Eye } from "lucide-react";
import { setOrganizationSuspendedAction } from "../../actions";
import { enterImpersonationAction } from "@/server/actions/impersonation";

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin(locale);
  const t = await getTranslations("admin");
  const tp = await getTranslations("project.statuses");
  const tr = await getTranslations("team.roles");
  const org = await getOrganizationForAdmin(id);
  if (!org) notFound();

  const suspended = Boolean(org.deletedAt);
  const country = getCountry(org.country);
  const toggleSuspend = setOrganizationSuspendedAction.bind(null, locale);

  const rows = [
    { label: t("orgTable.country"), value: country ? (locale === "fr" ? country.nameFr : country.nameEn) : org.country },
    { label: t("orgTable.created"), value: formatDate(org.createdAt, locale) },
    { label: t("orgTable.members"), value: String(org._count.members) },
    { label: t("orgTable.projects"), value: String(org._count.projects) },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t("organizations")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <div className="flex items-center gap-2">
          <Badge tone={suspended ? "danger" : "success"}>
            {suspended ? t("status.suspended") : t("status.active")}
          </Badge>
          {!suspended ? (
            <form action={enterImpersonationAction}>
              <input type="hidden" name="organizationId" value={org.id} />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" size="sm" variant="outline">
                <Eye className="size-4" />
                {t("impersonate")}
              </Button>
            </form>
          ) : null}
          <form action={toggleSuspend}>
            <input type="hidden" name="organizationId" value={org.id} />
            <input type="hidden" name="suspended" value={(!suspended).toString()} />
            <Button type="submit" size="sm" variant={suspended ? "default" : "destructive"}>
              {suspended ? t("restore") : t("suspend")}
            </Button>
          </form>
        </div>
      </div>

      {!suspended ? (
        <p className="text-xs text-muted-foreground">{t("suspendConfirm")}</p>
      ) : null}

      <Card>
        <CardContent className="pt-5">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((r) => (
              <div key={r.label}>
                <dt className="text-xs font-medium uppercase text-muted-foreground">{r.label}</dt>
                <dd className="mt-0.5 text-sm">{r.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("orgDetail.membersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {org.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <span>{m.user.name ?? m.user.email}</span>
              <Badge tone="primary">{tr(m.role)}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("orgDetail.projectsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {org.projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("orgDetail.noProjects")}</p>
          ) : (
            org.projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.name}</span>
                <StatusBadge status={p.status} label={tp(p.status)} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

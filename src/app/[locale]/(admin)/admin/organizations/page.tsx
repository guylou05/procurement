import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/server/authz";
import { listOrganizationsForAdmin } from "@/server/services/admin";
import { Link } from "@/i18n/routing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { getCountry } from "@/config/countries";
import { formatDate } from "@/lib/utils";
import { setOrganizationSuspendedAction } from "../actions";

export default async function AdminOrganizationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin(locale);
  const t = await getTranslations("admin");
  const orgs = await listOrganizationsForAdmin();
  const toggleSuspend = setOrganizationSuspendedAction.bind(null, locale);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("organizations")}</h1>

      {orgs.length === 0 ? (
        <EmptyState title={t("emptyOrgs")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("orgTable.name")}</th>
                  <th className="px-4 py-3 font-medium">{t("orgTable.country")}</th>
                  <th className="px-4 py-3 font-medium">{t("orgTable.members")}</th>
                  <th className="px-4 py-3 font-medium">{t("orgTable.projects")}</th>
                  <th className="px-4 py-3 font-medium">{t("orgTable.created")}</th>
                  <th className="px-4 py-3 font-medium">{t("orgTable.status")}</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => {
                  const suspended = Boolean(org.deletedAt);
                  const country = getCountry(org.country);
                  return (
                    <tr key={org.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/admin/organizations/${org.id}`} className="hover:underline">
                          {org.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {country ? (locale === "fr" ? country.nameFr : country.nameEn) : org.country}
                      </td>
                      <td className="px-4 py-3">{org._count.members}</td>
                      <td className="px-4 py-3">{org._count.projects}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(org.createdAt, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={suspended ? "danger" : "success"}>
                          {suspended ? t("status.suspended") : t("status.active")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <form action={toggleSuspend}>
                          <input type="hidden" name="organizationId" value={org.id} />
                          <input type="hidden" name="suspended" value={(!suspended).toString()} />
                          <Button type="submit" size="sm" variant="outline">
                            {suspended ? t("restore") : t("suspend")}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

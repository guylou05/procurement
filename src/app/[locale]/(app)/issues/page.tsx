import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { listIssues } from "@/server/services/issue";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { Plus, Check } from "lucide-react";
import { setIssueStatusAction } from "./actions";

export default async function IssuesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("issue");
  const tcat = await getTranslations("issue.categories");
  const tsev = await getTranslations("issue.severities");
  const tst = await getTranslations("issue.statuses");
  const issues = await listIssues(ctx);
  const setStatus = setIssueStatusAction.bind(null, locale);
  const canResolve = can(ctx, "issue:resolve");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {can(ctx, "issue:report") ? (
          <Button asChild>
            <Link href="/issues/new">
              <Plus className="size-4" />
              {t("new")}
            </Link>
          </Button>
        ) : null}
      </div>

      {issues.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("description")}</th>
                  <th className="px-4 py-3 font-medium">{t("project")}</th>
                  <th className="px-4 py-3 font-medium">{t("category")}</th>
                  <th className="px-4 py-3 font-medium">{t("severity")}</th>
                  <th className="px-4 py-3 font-medium">{t("status")}</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {issues.map((i) => (
                  <tr key={i.id} className="border-b last:border-0 align-top hover:bg-muted/30">
                    <td className="max-w-xs px-4 py-3 font-medium">{i.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">{i.project.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tcat.has(i.category) ? tcat(i.category) : i.category}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={i.severity} label={tsev(i.severity)} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={i.status} label={tst(i.status)} />
                    </td>
                    <td className="px-4 py-3">
                      {canResolve && (i.status === "OPEN" || i.status === "IN_PROGRESS") ? (
                        <form action={setStatus}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="status" value="RESOLVED" />
                          <Button type="submit" size="sm" variant="outline">
                            <Check className="size-4 text-success" />
                            {t("resolve")}
                          </Button>
                        </form>
                      ) : i.resolvedAt ? (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(i.resolvedAt, locale)}
                        </span>
                      ) : null}
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

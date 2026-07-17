import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, requirePermission } from "@/server/authz";
import { listProjects } from "@/server/services/project";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createIssueAction } from "../actions";

const CATEGORIES = [
  "Safety",
  "Quality",
  "EquipmentDamage",
  "MaterialShortage",
  "ClientComplaint",
  "Delay",
  "SiteAccess",
  "Worker",
  "General",
] as const;
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export default async function NewIssuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "issue:report");
  const t = await getTranslations("issue");
  const tcat = await getTranslations("issue.categories");
  const tsev = await getTranslations("issue.severities");
  const projects = await listProjects(ctx);
  const action = createIssueAction.bind(null, locale);

  if (projects.length === 0) {
    const tp = await getTranslations("project");
    return <EmptyState title={tp("empty")} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("new")}</h1>
      <Card>
        <CardContent className="pt-5">
          <form action={action} className="space-y-4">
            <div>
              <Label htmlFor="projectId">{t("project")}</Label>
              <select
                id="projectId"
                name="projectId"
                required
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="category">{t("category")}</Label>
                <select
                  id="category"
                  name="category"
                  required
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {tcat(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="severity">{t("severity")}</Label>
                <select
                  id="severity"
                  name="severity"
                  defaultValue="MEDIUM"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {tsev(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea id="description" name="description" required />
            </div>
            <Button type="submit" className="w-full">
              {t("new")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

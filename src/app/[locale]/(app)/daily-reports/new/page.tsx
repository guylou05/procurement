import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, requirePermission } from "@/server/authz";
import { listProjects } from "@/server/services/project";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createDailyReportAction } from "../actions";

export default async function NewDailyReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "report:submit");
  const t = await getTranslations("dailyReport");
  const tc = await getTranslations("common.actions");
  const projects = await listProjects(ctx);
  const action = createDailyReportAction.bind(null, locale);
  const today = new Date().toISOString().slice(0, 10);

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
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div>
                <Label htmlFor="date">{t("date")}</Label>
                <Input id="date" name="date" type="date" defaultValue={today} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="weather">{t("weather")}</Label>
                <Input id="weather" name="weather" />
              </div>
              <div>
                <Label htmlFor="workersPresent">{t("workersPresent")}</Label>
                <Input id="workersPresent" name="workersPresent" type="number" min="0" defaultValue="0" />
              </div>
              <div>
                <Label htmlFor="subcontractorsPresent">{t("subcontractorsPresent")}</Label>
                <Input
                  id="subcontractorsPresent"
                  name="subcontractorsPresent"
                  type="number"
                  min="0"
                  defaultValue="0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="workCompleted">{t("workCompleted")}</Label>
              <Textarea id="workCompleted" name="workCompleted" />
            </div>
            <div>
              <Label htmlFor="workPlanned">{t("workPlanned")}</Label>
              <Textarea id="workPlanned" name="workPlanned" />
            </div>
            <div>
              <Label htmlFor="materialsUsed">{t("materialsUsed")}</Label>
              <Textarea id="materialsUsed" name="materialsUsed" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="delays">{t("delays")}</Label>
                <Textarea id="delays" name="delays" />
              </div>
              <div>
                <Label htmlFor="safetyIncidents">{t("safetyIncidents")}</Label>
                <Textarea id="safetyIncidents" name="safetyIncidents" />
              </div>
            </div>
            <div>
              <Label htmlFor="blockers">{t("blockers")}</Label>
              <Textarea id="blockers" name="blockers" />
            </div>
            <div>
              <Label htmlFor="additionalNotes">{t("notes")}</Label>
              <Textarea id="additionalNotes" name="additionalNotes" />
            </div>
            <div className="flex gap-3">
              <Button type="submit" name="intent" value="draft" variant="outline" className="flex-1">
                {tc("saveDraft")}
              </Button>
              <Button type="submit" name="intent" value="submit" className="flex-1">
                {tc("submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

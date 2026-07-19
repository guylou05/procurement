import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, requirePermission } from "@/server/authz";
import { getProject } from "@/server/services/project";
import { listClients } from "@/server/services/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toMajor } from "@/lib/money";
import { updateProjectAction } from "../../actions";

const STATUSES = ["DRAFT", "PLANNED", "ACTIVE", "ON_HOLD", "DELAYED", "COMPLETED", "CANCELLED"] as const;

function d(date: Date | null | undefined) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "project:create");
  const t = await getTranslations("project");
  const ts = await getTranslations("project.statuses");
  const [project, clients] = await Promise.all([getProject(ctx, id), listClients(ctx)]);
  if (!project) notFound();
  const cur = project.currency ?? ctx.organization.currency;
  const action = updateProjectAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("edit")}</h1>
      <Card>
        <CardContent className="pt-5">
          <form action={action} className="space-y-4">
            <input type="hidden" name="id" value={project.id} />
            <div>
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" name="name" defaultValue={project.name} required />
            </div>
            <div>
              <Label htmlFor="clientId">{t("client")}</Label>
              <select
                id="clientId"
                name="clientId"
                defaultValue={project.clientId ?? ""}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
              >
                <option value="">—</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea id="description" name="description" defaultValue={project.description ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="city">{t("city")}</Label>
                <Input id="city" name="city" defaultValue={project.city ?? ""} />
              </div>
              <div>
                <Label htmlFor="budget">
                  {t("budget")} ({cur})
                </Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={toMajor(project.budgetMinor, cur)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="startDate">{t("startDate")}</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={d(project.startDate)} />
              </div>
              <div>
                <Label htmlFor="expectedEndDate">{t("endDate")}</Label>
                <Input id="expectedEndDate" name="expectedEndDate" type="date" defaultValue={d(project.expectedEndDate)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="status">{t("status")}</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={project.status}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ts(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="completionPercentage">{t("completion")} (%)</Label>
                <Input
                  id="completionPercentage"
                  name="completionPercentage"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={project.completionPercentage}
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

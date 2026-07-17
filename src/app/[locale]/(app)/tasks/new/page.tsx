import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, requirePermission } from "@/server/authz";
import { listProjects } from "@/server/services/project";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createTaskAction } from "../actions";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export default async function NewTaskPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "task:manage");
  const t = await getTranslations("task");
  const tpr = await getTranslations("task.priorities");
  const projects = await listProjects(ctx);
  const action = createTaskAction.bind(null, locale);

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
              <Label htmlFor="title">{t("taskTitle")}</Label>
              <Input id="title" name="title" required />
            </div>
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
                <Label htmlFor="priority">{t("priority")}</Label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue="MEDIUM"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {tpr(p)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="dueDate">{t("dueDate")}</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
            <div>
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea id="description" name="description" />
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

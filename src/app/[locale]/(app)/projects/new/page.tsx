import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, requirePermission } from "@/server/authz";
import { listClients } from "@/server/services/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createProjectAction } from "../actions";

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "project:create");
  const t = await getTranslations("project");
  const clients = await listClients(ctx);

  const action = createProjectAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("new")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">{t("name")}</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="code">{t("code")}</Label>
                <Input id="code" name="code" required />
              </div>
            </div>
            <div>
              <Label htmlFor="clientId">{t("client")}</Label>
              <select
                id="clientId"
                name="clientId"
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
              <Textarea id="description" name="description" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="city">{t("city")}</Label>
                <Input id="city" name="city" />
              </div>
              <div>
                <Label htmlFor="budget">
                  {t("budget")} ({ctx.organization.currency})
                </Label>
                <Input id="budget" name="budget" type="number" min="0" step="1" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="startDate">{t("startDate")}</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div>
                <Label htmlFor="expectedEndDate">{t("endDate")}</Label>
                <Input id="expectedEndDate" name="expectedEndDate" type="date" />
              </div>
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

import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, requirePermission } from "@/server/authz";
import { listProjects } from "@/server/services/project";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createMaterialRequestAction } from "../actions";
import { RequestItems } from "../request-items";

export default async function NewMaterialRequestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "material:request");
  const t = await getTranslations("material");
  const tc = await getTranslations("common.actions");
  const projects = await listProjects(ctx);
  const action = createMaterialRequestAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("newRequest")}</h1>
      <Card>
        <CardContent className="pt-5">
          <form action={action} className="space-y-4">
            <div>
              <Label htmlFor="projectId">{t("title")}</Label>
              <select
                id="projectId"
                name="projectId"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
              >
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t pt-4">
              <Label>{t("requestItems")}</Label>
              <RequestItems />
            </div>

            <div>
              <Label htmlFor="note">{t("note")}</Label>
              <Textarea id="note" name="note" />
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

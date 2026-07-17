import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, requirePermission } from "@/server/authz";
import { listClients } from "@/server/services/client";
import { listProjects } from "@/server/services/project";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createInvoiceAction } from "../actions";
import { InvoiceLineItems } from "../invoice-line-items";

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "invoice:manage");
  const t = await getTranslations("invoice");
  const [clients, projects] = await Promise.all([listClients(ctx), listProjects(ctx)]);
  const action = createInvoiceAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{t("new")}</h1>
      <Card>
        <CardContent className="pt-5">
          <form action={action} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="number">{t("number")}</Label>
                <Input id="number" name="number" required />
              </div>
              <div>
                <Label htmlFor="dueDate">{t("dueDate")}</Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label htmlFor="projectId">{t("project")}</Label>
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
            </div>

            <div className="border-t pt-4">
              <InvoiceLineItems currency={ctx.organization.currency} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tax">
                  {t("tax")} ({ctx.organization.currency})
                </Label>
                <Input id="tax" name="tax" type="number" min="0" step="any" defaultValue="0" />
              </div>
              <div>
                <Label htmlFor="discount">
                  {t("discount")} ({ctx.organization.currency})
                </Label>
                <Input id="discount" name="discount" type="number" min="0" step="any" defaultValue="0" />
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

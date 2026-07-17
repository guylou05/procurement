import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, requirePermission } from "@/server/authz";
import { listProjects } from "@/server/services/project";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createExpenseAction } from "../actions";

const METHODS = ["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CARD", "CHEQUE", "OTHER"] as const;

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "expense:record");
  const t = await getTranslations("expense");
  const tm = await getTranslations("expense.methods");
  const tc = await getTranslations("common.actions");
  const projects = await listProjects(ctx);
  const action = createExpenseAction.bind(null, locale);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("new")}</h1>
      <Card>
        <CardContent className="pt-5">
          <form action={action} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="amount">
                  {t("amount")} ({ctx.organization.currency})
                </Label>
                <Input id="amount" name="amount" type="number" min="0" step="any" required />
              </div>
              <div>
                <Label htmlFor="date">{t("date")}</Label>
                <Input id="date" name="date" type="date" defaultValue={today} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="vendor">{t("vendor")}</Label>
                <Input id="vendor" name="vendor" />
              </div>
              <div>
                <Label htmlFor="paymentMethod">{t("paymentMethod")}</Label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  required
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {tm(m)}
                    </option>
                  ))}
                </select>
              </div>
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
            <div>
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea id="description" name="description" />
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

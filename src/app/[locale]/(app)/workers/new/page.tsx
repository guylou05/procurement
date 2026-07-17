import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, requirePermission } from "@/server/authz";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createWorkerAction } from "../actions";

const TYPES = ["PERMANENT", "TEMPORARY", "CONTRACTOR", "SUBCONTRACTOR", "DAILY_LABORER"] as const;

export default async function NewWorkerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "worker:manage");
  const t = await getTranslations("worker");
  const tt = await getTranslations("worker.types");
  const action = createWorkerAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("new")}</h1>
      <Card>
        <CardContent className="pt-5">
          <form action={action} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fullName">{t("fullName")}</Label>
                <Input id="fullName" name="fullName" required />
              </div>
              <div>
                <Label htmlFor="workerId">{t("workerId")}</Label>
                <Input id="workerId" name="workerId" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="jobTitle">{t("jobTitle")}</Label>
                <Input id="jobTitle" name="jobTitle" />
              </div>
              <div>
                <Label htmlFor="skill">{t("skill")}</Label>
                <Input id="skill" name="skill" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input id="phone" name="phone" />
              </div>
              <div>
                <Label htmlFor="email">{t("email")}</Label>
                <Input id="email" name="email" type="email" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="employmentType">{t("employmentType")}</Label>
                <select
                  id="employmentType"
                  name="employmentType"
                  required
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  {TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {tt(ty)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="dailyRate">
                  {t("dailyRate")} ({ctx.organization.currency})
                </Label>
                <Input id="dailyRate" name="dailyRate" type="number" min="0" step="1" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="hireDate">{t("hireDate")}</Label>
                <Input id="hireDate" name="hireDate" type="date" />
              </div>
              <div>
                <Label htmlFor="emergencyContact">{t("emergencyContact")}</Label>
                <Input id="emergencyContact" name="emergencyContact" />
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

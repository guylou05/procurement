import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, requirePermission } from "@/server/authz";
import { getWorker } from "@/server/services/worker";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toMajor } from "@/lib/money";
import { updateWorkerAction } from "../../actions";

const TYPES = ["PERMANENT", "TEMPORARY", "CONTRACTOR", "SUBCONTRACTOR", "DAILY_LABORER"] as const;
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

function d(date: Date | null | undefined) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

export default async function EditWorkerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "worker:manage");
  const t = await getTranslations("worker");
  const tt = await getTranslations("worker.types");
  const ts = await getTranslations("worker.statuses");
  const worker = await getWorker(ctx, id);
  if (!worker) notFound();
  const cur = worker.currency ?? ctx.organization.currency;
  const action = updateWorkerAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("edit")}</h1>
      <Card>
        <CardContent className="pt-5">
          <form action={action} className="space-y-4">
            <input type="hidden" name="id" value={worker.id} />
            <div>
              <Label htmlFor="fullName">{t("fullName")}</Label>
              <Input id="fullName" name="fullName" defaultValue={worker.fullName} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="jobTitle">{t("jobTitle")}</Label>
                <Input id="jobTitle" name="jobTitle" defaultValue={worker.jobTitle ?? ""} />
              </div>
              <div>
                <Label htmlFor="skill">{t("skill")}</Label>
                <Input id="skill" name="skill" defaultValue={worker.skill ?? ""} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input id="phone" name="phone" defaultValue={worker.phone ?? ""} />
              </div>
              <div>
                <Label htmlFor="email">{t("email")}</Label>
                <Input id="email" name="email" type="email" defaultValue={worker.email ?? ""} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="employmentType">{t("employmentType")}</Label>
                <select
                  id="employmentType"
                  name="employmentType"
                  defaultValue={worker.employmentType}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  {TYPES.map((v) => (
                    <option key={v} value={v}>
                      {tt(v)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="status">{t("status")}</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={worker.status}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  {STATUSES.map((v) => (
                    <option key={v} value={v}>
                      {ts(v)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="dailyRate">
                  {t("dailyRate")} ({cur})
                </Label>
                <Input
                  id="dailyRate"
                  name="dailyRate"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={worker.dailyRateMinor != null ? toMajor(worker.dailyRateMinor, cur) : ""}
                />
              </div>
              <div>
                <Label htmlFor="hireDate">{t("hireDate")}</Label>
                <Input id="hireDate" name="hireDate" type="date" defaultValue={d(worker.hireDate)} />
              </div>
            </div>
            <div>
              <Label htmlFor="emergencyContact">{t("emergencyContact")}</Label>
              <Input id="emergencyContact" name="emergencyContact" defaultValue={worker.emergencyContact ?? ""} />
            </div>
            <div>
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea id="notes" name="notes" defaultValue={worker.notes ?? ""} />
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

import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, requirePermission } from "@/server/authz";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createEquipmentAction } from "../actions";

export default async function NewEquipmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "equipment:manage");
  const t = await getTranslations("equipment");
  const action = createEquipmentAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("new")}</h1>
      <Card>
        <CardContent className="pt-5">
          <form action={action} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">{t("name")}</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="assetId">{t("assetId")}</Label>
                <Input id="assetId" name="assetId" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="category">{t("category")}</Label>
                <Input id="category" name="category" />
              </div>
              <div>
                <Label htmlFor="serialNumber">{t("serialNumber")}</Label>
                <Input id="serialNumber" name="serialNumber" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="purchaseCost">
                  {t("purchaseCost")} ({ctx.organization.currency})
                </Label>
                <Input id="purchaseCost" name="purchaseCost" type="number" min="0" step="any" />
              </div>
              <div>
                <Label htmlFor="condition">{t("condition")}</Label>
                <Input id="condition" name="condition" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="location">{t("location")}</Label>
                <Input id="location" name="location" />
              </div>
              <div>
                <Label htmlFor="nextMaintenanceAt">{t("nextMaintenance")}</Label>
                <Input id="nextMaintenanceAt" name="nextMaintenanceAt" type="date" />
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

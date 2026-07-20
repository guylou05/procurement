import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, requirePermission } from "@/server/authz";
import { getEquipment } from "@/server/services/equipment";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toMajor } from "@/lib/money";
import { updateEquipmentAction } from "../../actions";

function d(date: Date | null | undefined) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "equipment:manage");
  const t = await getTranslations("equipment");
  const equipment = await getEquipment(ctx, id);
  if (!equipment) notFound();
  const cur = equipment.currency ?? ctx.organization.currency;
  const action = updateEquipmentAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("edit")}</h1>
      <Card>
        <CardContent className="pt-5">
          <form action={action} className="space-y-4">
            <input type="hidden" name="id" value={equipment.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">{t("name")}</Label>
                <Input id="name" name="name" defaultValue={equipment.name} required />
              </div>
              <div>
                <Label htmlFor="assetId">{t("assetId")}</Label>
                <Input id="assetId" name="assetId" defaultValue={equipment.assetId} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="category">{t("category")}</Label>
                <Input id="category" name="category" defaultValue={equipment.category ?? ""} />
              </div>
              <div>
                <Label htmlFor="serialNumber">{t("serial")}</Label>
                <Input id="serialNumber" name="serialNumber" defaultValue={equipment.serialNumber ?? ""} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="location">{t("location")}</Label>
                <Input id="location" name="location" defaultValue={equipment.location ?? ""} />
              </div>
              <div>
                <Label htmlFor="condition">{t("condition")}</Label>
                <Input id="condition" name="condition" defaultValue={equipment.condition ?? ""} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="purchaseCost">
                  {t("purchaseCost")} ({cur})
                </Label>
                <Input id="purchaseCost" name="purchaseCost" type="number" min="0" step="1" defaultValue={toMajor(equipment.purchaseCostMinor, cur)} />
              </div>
              <div>
                <Label htmlFor="nextMaintenanceAt">{t("nextMaintenance")}</Label>
                <Input id="nextMaintenanceAt" name="nextMaintenanceAt" type="date" defaultValue={d(equipment.nextMaintenanceAt)} />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea id="notes" name="notes" defaultValue={equipment.notes ?? ""} />
            </div>
            <Button type="submit" className="w-full">{t("save")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

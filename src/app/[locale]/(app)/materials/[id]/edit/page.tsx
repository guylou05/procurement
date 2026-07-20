import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, requirePermission } from "@/server/authz";
import { getMaterialHub } from "@/server/services/material";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toMajor } from "@/lib/money";
import { updateMaterialAction } from "../../actions";

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "material:manage");
  const t = await getTranslations("material");
  const data = await getMaterialHub(ctx, id);
  if (!data) notFound();
  const { material, currency } = data;
  const action = updateMaterialAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("edit")}</h1>
      <Card>
        <CardContent className="pt-5">
          <form action={action} className="space-y-4">
            <input type="hidden" name="id" value={material.id} />
            <div>
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" name="name" defaultValue={material.name} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sku">{t("sku")}</Label>
                <Input id="sku" name="sku" defaultValue={material.sku ?? ""} />
              </div>
              <div>
                <Label htmlFor="unit">{t("unit")}</Label>
                <Input id="unit" name="unit" defaultValue={material.unit} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="supplier">{t("supplier")}</Label>
                <Input id="supplier" name="supplier" defaultValue={material.supplier ?? ""} />
              </div>
              <div>
                <Label htmlFor="location">{t("location")}</Label>
                <Input id="location" name="location" defaultValue={material.location ?? ""} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="unitCost">
                  {t("unitCost")} ({currency})
                </Label>
                <Input
                  id="unitCost"
                  name="unitCost"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={toMajor(material.unitCostMinor, currency)}
                />
              </div>
              <div>
                <Label htmlFor="minQuantity">{t("minQuantity")}</Label>
                <Input
                  id="minQuantity"
                  name="minQuantity"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={material.minQuantity}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">{t("note")}</Label>
              <Textarea id="notes" name="notes" defaultValue={material.notes ?? ""} />
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

import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, requirePermission } from "@/server/authz";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createMaterialAction } from "../actions";

export default async function NewMaterialPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "material:manage");
  const t = await getTranslations("material");
  const action = createMaterialAction.bind(null, locale);

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
                <Label htmlFor="sku">{t("sku")}</Label>
                <Input id="sku" name="sku" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="unit">{t("unit")}</Label>
                <Input id="unit" name="unit" defaultValue="unit" required />
              </div>
              <div>
                <Label htmlFor="quantity">{t("quantity")}</Label>
                <Input id="quantity" name="quantity" type="number" min="0" step="any" defaultValue="0" />
              </div>
              <div>
                <Label htmlFor="minQuantity">{t("minQuantity")}</Label>
                <Input id="minQuantity" name="minQuantity" type="number" min="0" step="any" defaultValue="0" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="unitCost">
                  {t("unitCost")} ({ctx.organization.currency})
                </Label>
                <Input id="unitCost" name="unitCost" type="number" min="0" step="any" />
              </div>
              <div>
                <Label htmlFor="supplier">{t("supplier")}</Label>
                <Input id="supplier" name="supplier" />
              </div>
            </div>
            <div>
              <Label htmlFor="location">{t("location")}</Label>
              <Input id="location" name="location" />
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

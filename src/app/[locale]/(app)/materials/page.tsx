import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { listMaterials, isLowStock } from "@/server/services/material";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/money";
import { Plus } from "lucide-react";

export default async function MaterialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("material");
  const materials = await listMaterials(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {can(ctx, "material:manage") ? (
          <Button asChild>
            <Link href="/materials/new">
              <Plus className="size-4" />
              {t("new")}
            </Link>
          </Button>
        ) : null}
      </div>

      {materials.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("name")}</th>
                  <th className="px-4 py-3 font-medium">{t("sku")}</th>
                  <th className="px-4 py-3 font-medium">{t("quantity")}</th>
                  <th className="px-4 py-3 font-medium">{t("minQuantity")}</th>
                  <th className="px-4 py-3 font-medium">{t("unitCost")}</th>
                  <th className="px-4 py-3 font-medium">{t("supplier")}</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {m.name}
                        {isLowStock(m) ? (
                          <Badge tone="danger">{t("lowStock")}</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.sku ?? "—"}</td>
                    <td className="px-4 py-3">
                      {m.quantity} {m.unit}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.minQuantity} {m.unit}
                    </td>
                    <td className="px-4 py-3">
                      {formatMoney(m.unitCostMinor, m.currency ?? ctx.organization.currency, locale)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.supplier ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

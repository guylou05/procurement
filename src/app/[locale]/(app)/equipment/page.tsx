import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { listEquipment } from "@/server/services/equipment";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function EquipmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("equipment");
  const ts = await getTranslations("equipment.statuses");
  const equipment = await listEquipment(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {can(ctx, "equipment:manage") ? (
          <Button asChild>
            <Link href="/equipment/new">
              <Plus className="size-4" />
              {t("new")}
            </Link>
          </Button>
        ) : null}
      </div>

      {equipment.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("name")}</th>
                  <th className="px-4 py-3 font-medium">{t("assetId")}</th>
                  <th className="px-4 py-3 font-medium">{t("category")}</th>
                  <th className="px-4 py-3 font-medium">{t("status")}</th>
                  <th className="px-4 py-3 font-medium">{t("purchaseCost")}</th>
                  <th className="px-4 py-3 font-medium">{t("nextMaintenance")}</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/equipment/${e.id}`} className="hover:underline">
                        {e.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{e.assetId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.category ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} label={ts(e.status)} />
                    </td>
                    <td className="px-4 py-3">
                      {formatMoney(e.purchaseCostMinor, e.currency ?? ctx.organization.currency, locale)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(e.nextMaintenanceAt, locale)}
                    </td>
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

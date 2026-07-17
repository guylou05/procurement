import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, can } from "@/server/authz";
import { getEquipment } from "@/server/services/equipment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { setEquipmentStatusAction } from "../actions";

const STATUSES = ["AVAILABLE", "IN_USE", "UNDER_MAINTENANCE", "DAMAGED", "RETIRED"] as const;

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("equipment");
  const ts = await getTranslations("equipment.statuses");
  const equipment = await getEquipment(ctx, id);
  if (!equipment) notFound();
  const setStatus = setEquipmentStatusAction.bind(null, locale);
  const canManage = can(ctx, "equipment:manage");

  const rows = [
    { label: t("assetId"), value: equipment.assetId },
    { label: t("category"), value: equipment.category ?? "—" },
    { label: t("serialNumber"), value: equipment.serialNumber ?? "—" },
    { label: t("condition"), value: equipment.condition ?? "—" },
    { label: t("location"), value: equipment.location ?? "—" },
    {
      label: t("purchaseCost"),
      value: formatMoney(equipment.purchaseCostMinor, equipment.currency ?? ctx.organization.currency, locale),
    },
    { label: t("nextMaintenance"), value: formatDate(equipment.nextMaintenanceAt, locale) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{equipment.name}</h1>
        <StatusBadge status={equipment.status} label={ts(equipment.status)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <div key={r.label}>
                <dt className="text-xs font-medium uppercase text-muted-foreground">{r.label}</dt>
                <dd className="mt-0.5 text-sm">{r.value}</dd>
              </div>
            ))}
          </dl>

          {canManage ? (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {STATUSES.map((s) => (
                <form key={s} action={setStatus}>
                  <input type="hidden" name="id" value={equipment.id} />
                  <input type="hidden" name="status" value={s} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={equipment.status === s ? "default" : "outline"}
                  >
                    {ts(s)}
                  </Button>
                </form>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {equipment.maintenance.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("maintenance")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {equipment.maintenance.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span>{m.description ?? "—"}</span>
                <span className="text-muted-foreground">{formatDate(m.performedAt, locale)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

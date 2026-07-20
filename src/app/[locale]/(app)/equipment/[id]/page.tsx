import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, can } from "@/server/authz";
import { getEquipmentHub } from "@/server/services/equipment";
import { listProjects } from "@/server/services/project";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Pencil, Wallet, Wrench, CalendarClock, AlertTriangle, LogOut, LogIn } from "lucide-react";
import {
  checkOutEquipmentAction,
  checkInEquipmentAction,
  addMaintenanceAction,
} from "../actions";

export default async function EquipmentHubPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("equipment");
  const ts = await getTranslations("equipment.statuses");

  const data = await getEquipmentHub(ctx, id);
  if (!data) notFound();
  const { equipment, activeAssignment, currency, maintenanceCostMinor, overdue } = data;
  const canManage = can(ctx, "equipment:manage");
  const projects = canManage ? await listProjects(ctx) : [];
  const money = (n: number) => formatMoney(n, currency, locale);

  const checkOut = checkOutEquipmentAction.bind(null, locale);
  const checkIn = checkInEquipmentAction.bind(null, locale);
  const addMaint = addMaintenanceAction.bind(null, locale);

  const kpis = [
    { label: t("purchaseValue"), value: money(equipment.purchaseCostMinor), icon: Wallet },
    { label: t("totalMaintenance"), value: money(maintenanceCostMinor), icon: Wrench },
    { label: t("nextDue"), value: equipment.nextMaintenanceAt ? formatDate(equipment.nextMaintenanceAt, locale) : "—", icon: CalendarClock },
  ];

  const specs = [
    { label: t("assetId"), value: equipment.assetId },
    { label: t("category"), value: equipment.category ?? "—" },
    { label: t("serial"), value: equipment.serialNumber ?? "—" },
    { label: t("condition"), value: equipment.condition ?? "—" },
    { label: t("location"), value: equipment.location ?? "—" },
    { label: t("lastMaintenance"), value: equipment.lastMaintenanceAt ? formatDate(equipment.lastMaintenanceAt, locale) : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{equipment.name}</h1>
            <StatusBadge status={equipment.status} label={ts(equipment.status)} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {equipment.assetId}
            {equipment.category ? ` · ${equipment.category}` : ""}
          </p>
        </div>
        {canManage ? (
          <Button asChild variant="outline">
            <Link href={`/equipment/${equipment.id}/edit`}>
              <Pencil className="size-4" />
              {t("edit")}
            </Link>
          </Button>
        ) : null}
      </div>

      {overdue ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          {t("overdue")} ({t("nextDue")}: {formatDate(equipment.nextMaintenanceAt, locale)})
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">{k.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Specs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("overview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {specs.map((r) => (
                <div key={r.label}>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">{r.label}</dt>
                  <dd className="mt-0.5 text-sm">{r.value}</dd>
                </div>
              ))}
            </dl>
            {equipment.notes ? (
              <div className="mt-4 border-t pt-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">{t("notes")}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm">{equipment.notes}</dd>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("assignment")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeAssignment ? (
              <>
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{t("checkedOut")}</p>
                  <p className="text-muted-foreground">
                    {activeAssignment.project?.name ?? activeAssignment.workerName ?? "—"} ·{" "}
                    {formatDate(activeAssignment.checkedOutAt, locale)}
                  </p>
                </div>
                {canManage ? (
                  <form action={checkIn}>
                    <input type="hidden" name="id" value={equipment.id} />
                    <Button type="submit" variant="outline" className="w-full">
                      <LogIn className="size-4" />
                      {t("checkIn")}
                    </Button>
                  </form>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t("available")}</p>
                {canManage ? (
                  <form action={checkOut} className="space-y-2">
                    <input type="hidden" name="id" value={equipment.id} />
                    <select name="projectId" className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                      <option value="">{t("project")} —</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <Input name="workerName" placeholder={t("worker")} className="h-10" />
                    <Button type="submit" className="w-full">
                      <LogOut className="size-4" />
                      {t("checkOut")}
                    </Button>
                  </form>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Maintenance log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("maintenanceLog")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {equipment.maintenance.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noMaintenance")}</p>
            ) : (
              equipment.maintenance.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{m.description ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(m.performedAt, locale)}</p>
                  </div>
                  <span className="shrink-0">{money(m.costMinor)}</span>
                </div>
              ))
            )}
            {canManage ? (
              <form action={addMaint} className="space-y-2 border-t pt-3">
                <input type="hidden" name="id" value={equipment.id} />
                <Input name="description" placeholder={t("description")} className="h-9" />
                <div className="flex gap-2">
                  <Input name="cost" type="number" min="0" step="1" placeholder={t("cost")} className="h-9" />
                  <Input name="performedAt" type="date" className="h-9" title={t("date")} />
                  <Input name="nextMaintenanceAt" type="date" className="h-9" title={t("nextDue")} />
                </div>
                <Button type="submit" size="sm" variant="outline">{t("record")}</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        {/* Assignment history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("assignmentHistory")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {equipment.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noAssignments")}</p>
            ) : (
              equipment.assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{a.project?.name ?? a.workerName ?? "—"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(a.checkedOutAt, locale)}
                    {a.checkedInAt ? ` → ${formatDate(a.checkedInAt, locale)}` : ""}
                    {!a.checkedInAt ? <Badge tone="info" className="ml-2">{ts("IN_USE")}</Badge> : null}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

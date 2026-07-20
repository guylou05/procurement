import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, can } from "@/server/authz";
import { getMaterialHub } from "@/server/services/material";
import { listProjects } from "@/server/services/project";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Pencil, Package, Wallet, AlertTriangle } from "lucide-react";
import { recordTransactionAction } from "../actions";

const TXN_TYPES = ["RECEIVE", "PURCHASE", "ISSUE", "USE", "RETURN", "ADJUSTMENT", "DAMAGE", "LOSS"] as const;

export default async function MaterialHubPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("material");
  const th = await getTranslations("material.hub");
  const tty = await getTranslations("material.types");

  const data = await getMaterialHub(ctx, id);
  if (!data) notFound();
  const { material, currency, ledger, totalValueMinor, lowStock, usageByProject } = data;
  const canManage = can(ctx, "material:manage");
  const projects = canManage ? await listProjects(ctx) : [];
  const record = recordTransactionAction.bind(null, locale);

  const kpis = [
    { label: th("onHand"), value: `${material.quantity} ${material.unit}`, icon: Package },
    { label: th("totalValue"), value: formatMoney(totalValueMinor, currency, locale), icon: Wallet },
    { label: th("unitCost"), value: formatMoney(material.unitCostMinor, currency, locale), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{material.name}</h1>
            {lowStock ? <Badge tone="danger">{t("lowStock")}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {material.sku ?? "—"}
            {material.category ? ` · ${material.category.name}` : ""}
            {material.supplier ? ` · ${material.supplier}` : ""}
          </p>
        </div>
        {canManage ? (
          <Button asChild variant="outline">
            <Link href={`/materials/${material.id}/edit`}>
              <Pencil className="size-4" />
              {t("edit")}
            </Link>
          </Button>
        ) : null}
      </div>

      {lowStock ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          {th("lowStockWarning")} ({th("reorderAt")} {material.minQuantity} {material.unit})
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
                <p className="text-xl font-bold">{k.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Record movement */}
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{th("recordMovement")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={record} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
              <input type="hidden" name="materialId" value={material.id} />
              <div>
                <Label htmlFor="type">{th("movementType")}</Label>
                <select
                  id="type"
                  name="type"
                  defaultValue="RECEIVE"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {TXN_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {tty(v)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="quantity">{th("qty")}</Label>
                <Input id="quantity" name="quantity" type="number" min="0" step="any" required />
              </div>
              <div>
                <Label htmlFor="projectId">{th("project")}</Label>
                <select
                  id="projectId"
                  name="projectId"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">—</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="reason">{th("reason")}</Label>
                <Input id="reason" name="reason" />
              </div>
              <Button type="submit">{th("record")}</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ledger */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">{th("ledger")}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {ledger.length === 0 ? (
              <p className="px-6 text-sm text-muted-foreground">{th("noLedger")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">{th("when")}</th>
                      <th className="px-4 py-2 font-medium">{t("transactionType")}</th>
                      <th className="px-4 py-2 text-right font-medium">{th("change")}</th>
                      <th className="px-4 py-2 text-right font-medium">{th("balance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="px-4 py-2 text-muted-foreground">
                          {formatDate(tx.createdAt, locale)}
                          {tx.project ? ` · ${tx.project.name}` : ""}
                        </td>
                        <td className="px-4 py-2">{tty(tx.type)}</td>
                        <td className={`px-4 py-2 text-right font-medium ${tx.delta < 0 ? "text-destructive" : "text-success"}`}>
                          {tx.delta > 0 ? "+" : ""}
                          {tx.delta} {material.unit}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {tx.balanceAfter} {material.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage by project */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{th("usageByProject")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {usageByProject.length === 0 ? (
              <p className="text-sm text-muted-foreground">{th("noUsage")}</p>
            ) : (
              usageByProject.map((u) => (
                <div key={u.name} className="flex items-center justify-between text-sm">
                  <span className="truncate">{u.name}</span>
                  <span className="font-medium">
                    {u.qty} {material.unit}
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

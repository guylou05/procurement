import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { listMaterialRequests } from "@/server/services/material-request";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { Plus, Check, X } from "lucide-react";
import { decideMaterialRequestAction } from "./actions";

export default async function MaterialRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("material");
  const ts = await getTranslations("material.requestStatuses");
  const requests = await listMaterialRequests(ctx);
  const decide = decideMaterialRequestAction.bind(null, locale);
  const canApprove = can(ctx, "material:approve");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("requests")}</h1>
        {can(ctx, "material:request") ? (
          <Button asChild>
            <Link href="/materials/requests/new">
              <Plus className="size-4" />
              {t("newRequest")}
            </Link>
          </Button>
        ) : null}
      </div>

      {requests.length === 0 ? (
        <EmptyState title={t("requestsEmpty")} />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} label={ts(r.status)} />
                    <span className="text-xs text-muted-foreground">
                      {r.project?.name ?? "—"} · {formatDate(r.createdAt, locale)}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-0.5 text-sm">
                    {r.items.map((it) => (
                      <li key={it.id} className="text-muted-foreground">
                        {it.name} — {it.quantity} {it.unit}
                      </li>
                    ))}
                  </ul>
                </div>
                {canApprove && r.status === "SUBMITTED" ? (
                  <div className="flex gap-1">
                    <form action={decide}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="APPROVED" />
                      <Button type="submit" size="icon" variant="outline">
                        <Check className="size-4 text-success" />
                      </Button>
                    </form>
                    <form action={decide}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="REJECTED" />
                      <Button type="submit" size="icon" variant="outline">
                        <X className="size-4 text-destructive" />
                      </Button>
                    </form>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

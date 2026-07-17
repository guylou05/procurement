import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { listWorkers } from "@/server/services/worker";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/money";
import { Plus } from "lucide-react";

export default async function WorkersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("worker");
  const tt = await getTranslations("worker.types");
  const ts = await getTranslations("worker.statuses");
  const workers = await listWorkers(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {can(ctx, "worker:manage") ? (
          <Button asChild>
            <Link href="/workers/new">
              <Plus className="size-4" />
              {t("new")}
            </Link>
          </Button>
        ) : null}
      </div>

      {workers.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("fullName")}</th>
                  <th className="px-4 py-3 font-medium">{t("workerId")}</th>
                  <th className="px-4 py-3 font-medium">{t("jobTitle")}</th>
                  <th className="px-4 py-3 font-medium">{t("employmentType")}</th>
                  <th className="px-4 py-3 font-medium">{t("dailyRate")}</th>
                  <th className="px-4 py-3 font-medium">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/workers/${w.id}`} className="hover:underline">
                        {w.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{w.workerId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{w.jobTitle ?? "—"}</td>
                    <td className="px-4 py-3">{tt(w.employmentType)}</td>
                    <td className="px-4 py-3">
                      {w.dailyRateMinor != null
                        ? formatMoney(w.dailyRateMinor, w.currency ?? ctx.organization.currency, locale)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={w.status} label={ts(w.status)} />
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

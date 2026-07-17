import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth } from "@/server/authz";
import { getWorker } from "@/server/services/worker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("worker");
  const tt = await getTranslations("worker.types");
  const ts = await getTranslations("worker.statuses");
  const tas = await getTranslations("attendance.statuses");
  const worker = await getWorker(ctx, id);
  if (!worker) notFound();

  const rows = [
    { label: t("workerId"), value: worker.workerId },
    { label: t("jobTitle"), value: worker.jobTitle ?? "—" },
    { label: t("skill"), value: worker.skill ?? "—" },
    { label: t("phone"), value: worker.phone ?? "—" },
    { label: t("employmentType"), value: tt(worker.employmentType) },
    {
      label: t("dailyRate"),
      value:
        worker.dailyRateMinor != null
          ? formatMoney(worker.dailyRateMinor, worker.currency ?? ctx.organization.currency, locale)
          : "—",
    },
    { label: t("hireDate"), value: formatDate(worker.hireDate, locale) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{worker.fullName}</h1>
        <StatusBadge status={worker.status} label={ts(worker.status)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <div key={r.label}>
                <dt className="text-xs font-medium uppercase text-muted-foreground">{r.label}</dt>
                <dd className="mt-0.5 text-sm">{r.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {worker.attendance.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("status")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {worker.attendance.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{formatDate(a.date, locale)}</span>
                <StatusBadge status={a.status} label={tas(a.status)} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

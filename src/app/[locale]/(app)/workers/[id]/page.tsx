import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, can } from "@/server/authz";
import { getWorkerHub } from "@/server/services/worker";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Pencil, Plus, X, Percent, CalendarCheck, Wallet, ShieldCheck } from "lucide-react";
import { addCertificationAction, removeCertificationAction } from "../actions";

export default async function WorkerHubPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("worker");
  const th = await getTranslations("worker.hub");
  const tt = await getTranslations("worker.types");
  const ts = await getTranslations("worker.statuses");
  const tas = await getTranslations("attendance.statuses");

  const data = await getWorkerHub(ctx, id);
  if (!data) notFound();
  const { worker, summary, certifications } = data;
  const canManage = can(ctx, "worker:manage");
  const cur = summary.currency;

  const addCert = addCertificationAction.bind(null, locale);
  const removeCert = removeCertificationAction.bind(null, locale);

  const kpis = [
    { label: th("attendanceRate"), value: `${summary.attendanceRate}%`, icon: Percent },
    { label: th("daysWorked"), value: String(summary.daysWorked), icon: CalendarCheck },
    { label: th("estEarnings"), value: formatMoney(summary.estEarningsMinor, cur, locale), icon: Wallet },
    { label: th("activeCerts"), value: String(summary.activeCerts), icon: ShieldCheck },
  ];

  const profile = [
    { label: t("workerId"), value: worker.workerId },
    { label: t("jobTitle"), value: worker.jobTitle ?? "—" },
    { label: t("skill"), value: worker.skill ?? "—" },
    { label: t("phone"), value: worker.phone ?? "—" },
    { label: t("email"), value: worker.email ?? "—" },
    { label: t("employmentType"), value: tt(worker.employmentType) },
    {
      label: t("dailyRate"),
      value: worker.dailyRateMinor != null ? formatMoney(worker.dailyRateMinor, cur, locale) : "—",
    },
    { label: t("hireDate"), value: formatDate(worker.hireDate, locale) },
    { label: t("emergencyContact"), value: worker.emergencyContact ?? "—" },
  ];

  const certTone = (state: string) =>
    state === "expired" ? "danger" : state === "soon" ? "warning" : "success";
  const certLabel = (state: string) =>
    state === "expired" ? th("expired") : state === "soon" ? th("expiringSoon") : th("valid");

  const attCounts = [
    { label: th("present"), value: summary.counts.PRESENT },
    { label: th("late"), value: summary.counts.LATE },
    { label: th("absent"), value: summary.counts.ABSENT },
    { label: th("halfDay"), value: summary.counts.HALF_DAY },
    { label: th("overtime"), value: summary.counts.OVERTIME },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{worker.fullName}</h1>
            <StatusBadge status={worker.status} label={ts(worker.status)} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {worker.workerId}
            {worker.jobTitle ? ` · ${worker.jobTitle}` : ""}
          </p>
        </div>
        {canManage ? (
          <Button asChild variant="outline">
            <Link href={`/workers/${worker.id}/edit`}>
              <Pencil className="size-4" />
              {t("edit")}
            </Link>
          </Button>
        ) : null}
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {k.label} <span className="lowercase">· {th("thisMonth")}</span>
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{k.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("profile")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.map((r) => (
                <div key={r.label}>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">{r.label}</dt>
                  <dd className="mt-0.5 text-sm">{r.value}</dd>
                </div>
              ))}
            </dl>
            {worker.notes ? (
              <div className="mt-4 border-t pt-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">{t("notes")}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm">{worker.notes}</dd>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Attendance summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{th("attendanceSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attCounts.map((a) => (
              <div key={a.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{a.label}</span>
                <span className="font-medium">{a.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{th("certifications")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {certifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">{th("noCerts")}</p>
            ) : (
              certifications.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    {c.expiresAt ? (
                      <p className="text-xs text-muted-foreground">
                        {th("expires")}: {formatDate(c.expiresAt, locale)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {c.state !== "none" ? (
                      <Badge tone={certTone(c.state)}>{certLabel(c.state)}</Badge>
                    ) : null}
                    {canManage ? (
                      <form action={removeCert}>
                        <input type="hidden" name="workerId" value={worker.id} />
                        <input type="hidden" name="certId" value={c.id} />
                        <button type="submit" className="text-muted-foreground hover:text-destructive">
                          <X className="size-4" />
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            {canManage ? (
              <form action={addCert} className="space-y-2 border-t pt-3">
                <input type="hidden" name="workerId" value={worker.id} />
                <Input name="name" placeholder={th("certName")} required className="h-9" />
                <div className="flex gap-2">
                  <Input name="issuedAt" type="date" className="h-9" title={th("issued")} />
                  <Input name="expiresAt" type="date" className="h-9" title={th("expires")} />
                  <Button type="submit" size="sm" variant="outline">
                    <Plus className="size-4" />
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>

        {/* Recent attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{th("recentAttendance")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {worker.attendance.length === 0 ? (
              <p className="text-sm text-muted-foreground">{th("noAttendance")}</p>
            ) : (
              worker.attendance.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatDate(a.date, locale)}
                    {a.project ? ` · ${a.project.name}` : ""}
                  </span>
                  <StatusBadge status={a.status} label={tas(a.status)} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{th("documents")}</CardTitle>
        </CardHeader>
        <CardContent>
          {worker.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{th("noDocuments")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {worker.documents.map((doc) => (
                <span key={doc.id} className="rounded-md border bg-muted px-2 py-1 text-xs">
                  {doc.name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

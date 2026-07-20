import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, can } from "@/server/authz";
import { getDailyReportDetail } from "@/server/services/daily-report";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, Check, Send } from "lucide-react";
import {
  reviewDailyReportAction,
  addReportCommentAction,
  submitDraftReportAction,
  uploadReportPhotoAction,
} from "../actions";

export default async function DailyReportDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("dailyReport");
  const td = await getTranslations("dailyReport.detail");
  const ts = await getTranslations("dailyReport.statuses");
  const data = await getDailyReportDetail(ctx, id);
  if (!data) notFound();
  const { report, comments } = data;

  const canReview = can(ctx, "report:review");
  const canSubmit = can(ctx, "report:submit");
  const review = reviewDailyReportAction.bind(null, locale);
  const comment = addReportCommentAction.bind(null, locale);
  const submit = submitDraftReportAction.bind(null, locale);
  const uploadPhoto = uploadReportPhotoAction.bind(null, locale);

  const siteRows = [
    { label: t("weather"), value: report.weather },
    { label: t("workersPresent"), value: String(report.workersPresent) },
    { label: t("subcontractorsPresent"), value: String(report.subcontractorsPresent) },
  ];
  const workRows = [
    { label: t("workCompleted"), value: report.workCompleted },
    { label: t("workPlanned"), value: report.workPlanned },
    { label: t("materialsUsed"), value: report.materialsUsed },
  ];
  const problemRows = [
    { label: t("delays"), value: report.delays },
    { label: t("safetyIncidents"), value: report.safetyIncidents },
    { label: t("blockers"), value: report.blockers },
    { label: t("notes"), value: report.additionalNotes },
  ];

  function Section({ title, rows }: { title: string; rows: { label: string; value: string | null }[] }) {
    const shown = rows.filter((r) => r.value != null && r.value !== "");
    if (shown.length === 0) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {shown.map((r) => (
            <div key={r.label}>
              <p className="text-xs font-medium uppercase text-muted-foreground">{r.label}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm">{r.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/daily-reports"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t("title")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{report.project.name}</h1>
            <StatusBadge status={report.status} label={ts(report.status)} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(report.date, locale)}
            {report.supervisor ? ` · ${td("supervisor")}: ${report.supervisor.name ?? report.supervisor.email}` : ""}
          </p>
        </div>
        {report.status === "DRAFT" && canSubmit ? (
          <form action={submit}>
            <input type="hidden" name="id" value={report.id} />
            <Button type="submit">
              <Send className="size-4" />
              {td("submit")}
            </Button>
          </form>
        ) : null}
      </div>

      {/* Review panel */}
      {canReview && report.status === "SUBMITTED" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{td("review")}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* A single submit with the decision carried by a <select>. React Server
                Actions do not reliably include a clicked submit button's name/value in
                the action FormData, so decision must be a real form field, not a button. */}
            <form action={review} className="space-y-3">
              <input type="hidden" name="id" value={report.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="decision">{td("review")}</Label>
                  <select
                    id="decision"
                    name="decision"
                    defaultValue="APPROVED"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                  >
                    <option value="APPROVED">{td("approve")}</option>
                    <option value="CHANGES_REQUESTED">{td("requestChanges")}</option>
                    <option value="REJECTED">{td("reject")}</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="note">{td("reviewNote")}</Label>
                  <Input id="note" name="note" />
                </div>
              </div>
              <Button type="submit">
                <Check className="size-4" />
                {td("review")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {report.reviewedById && report.reviewer ? (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <span className="font-medium">{td("reviewedBy")}:</span>{" "}
          {report.reviewer.name ?? report.reviewer.email}
          {report.reviewedAt ? ` · ${formatDate(report.reviewedAt, locale)}` : ""}
          {report.reviewNote ? (
            <p className="mt-1 text-muted-foreground">
              {td("reviewNoteLabel")}: {report.reviewNote}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title={td("site")} rows={siteRows} />
        <Section title={td("work")} rows={workRows} />
        <Section title={td("problems")} rows={problemRows} />
      </div>

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{td("photos")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">{td("noPhotos")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {report.photos.map((p) => (
                <a
                  key={p.id}
                  href={`/api/files/${p.attachmentId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-md border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${p.attachmentId}`}
                    alt={p.caption ?? ""}
                    className="aspect-square w-full object-cover transition group-hover:opacity-90"
                  />
                  {p.caption ? <p className="truncate p-1 text-xs">{p.caption}</p> : null}
                </a>
              ))}
            </div>
          )}
          {canSubmit ? (
            <form action={uploadPhoto} className="flex flex-wrap items-center gap-2 border-t pt-3">
              <input type="hidden" name="id" value={report.id} />
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                required
                className="text-sm"
              />
              <Input name="caption" placeholder={td("addPhoto")} className="h-9 max-w-xs" />
              <Button type="submit" variant="outline" size="sm">
                {td("upload")}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{td("comments")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{td("noComments")}</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.authorName}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(c.createdAt, locale)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{c.body}</p>
                </div>
              ))}
            </div>
          )}
          <form action={comment} className="flex gap-2">
            <input type="hidden" name="id" value={report.id} />
            <Textarea name="body" placeholder={td("addComment")} required className="min-h-10" rows={1} />
            <Button type="submit" variant="outline">
              {td("post")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

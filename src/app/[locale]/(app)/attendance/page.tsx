import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/server/authz";
import { listProjects } from "@/server/services/project";
import { listWorkersForProject, getAttendanceForDay } from "@/server/services/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { saveAttendanceAction } from "./actions";
import { Button } from "@/components/ui/button";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "HALF_DAY", "OVERTIME"] as const;

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ projectId?: string; date?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("attendance");
  const ts = await getTranslations("attendance.statuses");

  const projects = await listProjects(ctx);
  const selectedProjectId = sp.projectId ?? projects[0]?.id;
  const date = sp.date ?? new Date().toISOString().slice(0, 10);

  const workers = selectedProjectId
    ? await listWorkersForProject(ctx, selectedProjectId)
    : [];
  const todaysRecords = selectedProjectId
    ? await getAttendanceForDay(ctx, selectedProjectId, new Date(date))
    : [];
  const statusByWorker = new Map(todaysRecords.map((r) => [r.workerId, r.status]));

  const action = saveAttendanceAction.bind(null, locale);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("selectProject")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap gap-3">
            <select
              name="projectId"
              defaultValue={selectedProjectId}
              className="h-11 rounded-md border border-input bg-background px-3 text-base"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="h-11 rounded-md border border-input bg-background px-3 text-base"
            />
            <Button type="submit" variant="outline">
              {t("selectProject")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {workers.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="space-y-3">
          {workers.map((w) => {
            const current = statusByWorker.get(w.id);
            return (
              <Card key={w.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-muted text-sm font-medium">
                      {w.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{w.fullName}</p>
                      <p className="text-xs text-muted-foreground">{w.jobTitle ?? w.workerId}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {current ? <StatusBadge status={current} label={ts(current)} /> : null}
                    {STATUSES.map((s) => (
                      <form key={s} action={action}>
                        <input type="hidden" name="projectId" value={selectedProjectId} />
                        <input type="hidden" name="workerId" value={w.id} />
                        <input type="hidden" name="date" value={date} />
                        <input type="hidden" name="status" value={s} />
                        <Button
                          type="submit"
                          size="sm"
                          variant={current === s ? "default" : "outline"}
                        >
                          {ts(s)}
                        </Button>
                      </form>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

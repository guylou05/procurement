import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, can } from "@/server/authz";
import {
  getProjectHub,
  getProjectBudget,
  getProjectAnalytics,
  listAssignableUsers,
} from "@/server/services/project";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarList } from "@/components/charts/bar-list";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import {
  Pencil,
  Plus,
  CheckCircle2,
  Circle,
  X,
  ClipboardList,
  CheckSquare,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import {
  addMilestoneAction,
  toggleMilestoneAction,
  addProjectMemberAction,
  removeProjectMemberAction,
} from "../actions";

export default async function ProjectHubPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("project");
  const th = await getTranslations("project.hub");
  const ta = await getTranslations("project.analytics");
  const tp = await getTranslations("project.statuses");
  const tts = await getTranslations("task.statuses");
  const tsev = await getTranslations("issue.severities");
  const tds = await getTranslations("dailyReport.statuses");

  const [hub, budget, analytics, assignable] = await Promise.all([
    getProjectHub(ctx, id),
    getProjectBudget(ctx, id),
    getProjectAnalytics(ctx, id),
    listAssignableUsers(ctx),
  ]);
  if (!hub || !budget || !analytics) notFound();
  const { project, recent, counts } = hub;
  const cur = budget.currency;
  const money = (n: number) => formatMoney(n, cur, locale);
  const canManage = can(ctx, "project:create");
  const canAssign = can(ctx, "project:assign");
  const over = budget.remainingMinor < 0;

  const addMs = addMilestoneAction.bind(null, locale);
  const toggleMs = toggleMilestoneAction.bind(null, locale);
  const addMember = addProjectMemberAction.bind(null, locale);
  const removeMember = removeProjectMemberAction.bind(null, locale);

  const memberIds = new Set(project.members.map((m) => m.userId));
  const addable = assignable.filter((u) => !memberIds.has(u.id));

  const kpis = [
    { label: th("dailyReports"), value: counts.reports, icon: ClipboardList },
    { label: th("tasks"), value: counts.tasks, icon: CheckSquare },
    { label: th("openIssues"), value: counts.openIssues, icon: AlertTriangle },
    { label: th("expenses"), value: counts.expenses, icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <StatusBadge status={project.status} label={tp(project.status)} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.code}
            {project.client ? ` · ${project.client.name}` : ""}
            {project.city ? ` · ${project.city}` : ""}
          </p>
        </div>
        {canManage ? (
          <Button asChild variant="outline">
            <Link href={`/projects/${project.id}/edit`}>
              <Pencil className="size-4" />
              {t("edit")}
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Completion + KPI row */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase text-muted-foreground">{t("completion")}</p>
            <p className="mt-1 text-3xl font-bold">{project.completionPercentage}%</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${project.completionPercentage}%` }} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {formatDate(project.startDate, locale)} — {formatDate(project.expectedEndDate, locale)}
            </p>
          </CardContent>
        </Card>
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{k.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Budget vs actual */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{th("budget")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">{th("budgetLabel")}</p>
                <p className="text-lg font-semibold">{formatMoney(budget.budgetMinor, cur, locale)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">{th("spent")}</p>
                <p className="text-lg font-semibold">{formatMoney(budget.spentMinor, cur, locale)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">{th("remaining")}</p>
                <p className={`text-lg font-semibold ${over ? "text-destructive" : ""}`}>
                  {formatMoney(budget.remainingMinor, cur, locale)}
                </p>
              </div>
            </div>
            {budget.budgetMinor > 0 ? (
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${over ? "bg-destructive" : "bg-success"}`}
                  style={{ width: `${Math.min(100, (budget.spentMinor / budget.budgetMinor) * 100)}%` }}
                />
              </div>
            ) : null}
            {over ? <p className="text-xs font-medium text-destructive">{th("overBudget")}</p> : null}

            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">{th("breakdown")}</p>
              {budget.breakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">{th("noSpend")}</p>
              ) : (
                <div className="space-y-2">
                  {budget.breakdown.map((b) => {
                    const pct = budget.spentMinor > 0 ? (b.minor / budget.spentMinor) * 100 : 0;
                    return (
                      <div key={b.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{b.name}</span>
                          <span className="text-muted-foreground">{formatMoney(b.minor, cur, locale)}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{th("team")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.projectManager ? (
              <div className="flex items-center justify-between text-sm">
                <span>{project.projectManager.name ?? project.projectManager.email}</span>
                <Badge tone="primary">{t("manager")}</Badge>
              </div>
            ) : null}
            {project.supervisor ? (
              <div className="flex items-center justify-between text-sm">
                <span>{project.supervisor.name ?? project.supervisor.email}</span>
                <Badge tone="info">{t("supervisor")}</Badge>
              </div>
            ) : null}
            {project.members.length === 0 && !project.projectManager && !project.supervisor ? (
              <p className="text-sm text-muted-foreground">{th("noMembers")}</p>
            ) : null}
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span>{m.user.name ?? m.user.email}</span>
                {canAssign ? (
                  <form action={removeMember}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="userId" value={m.userId} />
                    <button type="submit" className="text-muted-foreground hover:text-destructive" title={th("remove")}>
                      <X className="size-4" />
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
            {canAssign && addable.length > 0 ? (
              <form action={addMember} className="flex gap-2 border-t pt-3">
                <input type="hidden" name="projectId" value={project.id} />
                <select
                  name="userId"
                  className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {addable.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="outline">
                  {th("addMember")}
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Analytics */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          {ta("title")} <span className="text-sm font-normal text-muted-foreground">· {ta("last8Weeks")}</span>
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <TrendChart data={analytics.spendTrend} title={ta("weeklySpend")} subtitle={ta("last8Weeks")} format={money} />
          <TrendChart
            data={analytics.spendCumulative}
            title={ta("cumulativeSpend")}
            subtitle={analytics.budgetMinor > 0 ? ta("ofBudget", { amount: money(analytics.budgetMinor) }) : ta("last8Weeks")}
            format={money}
            total={analytics.spendCumulative.at(-1)?.value ?? 0}
            accent="hsl(var(--warning))"
          />
          <TrendChart
            data={analytics.laborTrend}
            title={ta("labor")}
            subtitle={ta("last8Weeks")}
            accent="hsl(var(--accent))"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{ta("taskBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.taskDistribution.length === 0 ? (
              <EmptyState title={ta("noTasks")} />
            ) : (
              <BarList
                items={analytics.taskDistribution.map((s) => ({
                  label: tts(s.status),
                  value: s.count,
                  display: `${s.count} · ${Math.round((s.count / analytics.taskTotal) * 100)}%`,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{th("milestones")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">{th("noMilestones")}</p>
            ) : (
              project.milestones.map((m) => {
                const done = m.completion >= 100;
                return (
                  <div key={m.id} className="flex items-center gap-3 text-sm">
                    {canManage ? (
                      <form action={toggleMs}>
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="milestoneId" value={m.id} />
                        <button type="submit" className="flex">
                          {done ? (
                            <CheckCircle2 className="size-4 text-success" />
                          ) : (
                            <Circle className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      </form>
                    ) : done ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground" />
                    )}
                    <span className={`flex-1 ${done ? "text-muted-foreground line-through" : ""}`}>{m.name}</span>
                    {m.dueDate ? (
                      <span className="text-xs text-muted-foreground">{formatDate(m.dueDate, locale)}</span>
                    ) : null}
                  </div>
                );
              })
            )}
            {canManage ? (
              <form action={addMs} className="flex gap-2 border-t pt-3">
                <input type="hidden" name="projectId" value={project.id} />
                <Input name="name" placeholder={th("milestoneName")} required className="h-9" />
                <Input name="dueDate" type="date" className="h-9 w-40" />
                <Button type="submit" size="sm" variant="outline">
                  <Plus className="size-4" />
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        {/* Recent activity across linked records */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{th("recentReports")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">{th("none")}</p>
            ) : (
              recent.reports.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(r.date, locale)}</span>
                  <StatusBadge status={r.status} label={tds(r.status)} />
                </div>
              ))
            )}
            {recent.issues.length > 0 ? (
              <div className="border-t pt-2">
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{th("recentIssues")}</p>
                {recent.issues.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{i.description}</span>
                    <StatusBadge status={i.severity} label={tsev(i.severity)} />
                  </div>
                ))}
              </div>
            ) : null}
            {recent.expenses.length > 0 ? (
              <div className="border-t pt-2">
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{th("recentExpenses")}</p>
                {recent.expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">{e.vendor ?? "—"}</span>
                    <span>{formatMoney(e.amountMinor, e.currency, locale)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

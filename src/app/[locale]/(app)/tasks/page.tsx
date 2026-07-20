import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { listTasks } from "@/server/services/task";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { Plus, MessageSquare, CheckSquare, LayoutGrid, List } from "lucide-react";

const COLUMNS = ["TODO", "IN_PROGRESS", "BLOCKED", "AWAITING_REVIEW", "COMPLETED"] as const;

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}
function priorityTone(p: string): "danger" | "warning" | "info" | "neutral" {
  return p === "URGENT" ? "danger" : p === "HIGH" ? "warning" : p === "MEDIUM" ? "info" : "neutral";
}

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { locale } = await params;
  const { view } = await searchParams;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("task");
  const tst = await getTranslations("task.statuses");
  const tpr = await getTranslations("task.priorities");
  const tasks = await listTasks(ctx);
  const isList = view === "list";

  const Avatar = ({ name }: { name?: string | null }) => (
    <span
      className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary"
      title={name ?? t("unassigned")}
    >
      {initials(name)}
    </span>
  );

  const Meta = ({ task }: { task: (typeof tasks)[number] }) => {
    const done = task.checklist.filter((c) => c.done).length;
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge tone={priorityTone(task.priority)}>{tpr(task.priority)}</Badge>
        <span>{task.project.name}</span>
        {task.dueDate ? <span>· {formatDate(task.dueDate, locale)}</span> : null}
        {task.checklist.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <CheckSquare className="size-3" />
            {done}/{task.checklist.length}
          </span>
        ) : null}
        {task._count.comments > 0 ? (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3" />
            {task._count.comments}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            <Link
              href="/tasks"
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-sm ${!isList ? "bg-muted font-medium" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="size-4" />
              {t("board")}
            </Link>
            <Link
              href="/tasks?view=list"
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-sm ${isList ? "bg-muted font-medium" : "text-muted-foreground"}`}
            >
              <List className="size-4" />
              {t("list")}
            </Link>
          </div>
          {can(ctx, "task:manage") ? (
            <Button asChild>
              <Link href="/tasks/new">
                <Plus className="size-4" />
                {t("new")}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : isList ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("taskTitle")}</th>
                  <th className="px-4 py-3 font-medium">{t("project")}</th>
                  <th className="px-4 py-3 font-medium">{t("assignee")}</th>
                  <th className="px-4 py-3 font-medium">{t("priority")}</th>
                  <th className="px-4 py-3 font-medium">{t("status")}</th>
                  <th className="px-4 py-3 font-medium">{t("dueDate")}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/tasks/${task.id}`} className="hover:underline">
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{task.project.name}</td>
                    <td className="px-4 py-3">{task.assignee?.name ?? t("unassigned")}</td>
                    <td className="px-4 py-3">
                      <Badge tone={priorityTone(task.priority)}>{tpr(task.priority)}</Badge>
                    </td>
                    <td className="px-4 py-3">{tst(task.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {task.dueDate ? formatDate(task.dueDate, locale) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((col) => {
            const items = tasks.filter((task) => task.status === col);
            return (
              <div key={col} className="w-72 shrink-0 space-y-3">
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                  <h2 className="text-sm font-semibold">{tst(col)}</h2>
                  <Badge tone="neutral">{items.length}</Badge>
                </div>
                {items.map((task) => (
                  <Link key={task.id} href={`/tasks/${task.id}`} className="block">
                    <Card className="space-y-2 p-3 transition hover:border-primary/40 hover:shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{task.title}</p>
                        <Avatar name={task.assignee?.name} />
                      </div>
                      <Meta task={task} />
                    </Card>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

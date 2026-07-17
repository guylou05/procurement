import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { listTasks } from "@/server/services/task";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";
import { setTaskStatusAction } from "./actions";

const COLUMNS = ["TODO", "IN_PROGRESS", "AWAITING_REVIEW", "COMPLETED"] as const;
const NEXT: Record<string, string> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "AWAITING_REVIEW",
  AWAITING_REVIEW: "COMPLETED",
};

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("task");
  const tst = await getTranslations("task.statuses");
  const tpr = await getTranslations("task.priorities");
  const tasks = await listTasks(ctx);
  const advance = setTaskStatusAction.bind(null, locale);
  const canMove = can(ctx, "task:complete");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {can(ctx, "task:manage") ? (
          <Button asChild>
            <Link href="/tasks/new">
              <Plus className="size-4" />
              {t("new")}
            </Link>
          </Button>
        ) : null}
      </div>

      {tasks.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.status === col);
            return (
              <div key={col} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">{tst(col)}</h2>
                  <Badge tone="neutral">{items.length}</Badge>
                </div>
                {items.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="space-y-2 p-4">
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{task.project.name}</span>
                        <Badge tone="info">{tpr(task.priority)}</Badge>
                        {task.dueDate ? <span>{formatDate(task.dueDate, locale)}</span> : null}
                      </div>
                      {canMove && NEXT[col] ? (
                        <form action={advance}>
                          <input type="hidden" name="id" value={task.id} />
                          <input type="hidden" name="status" value={NEXT[col]} />
                          <Button type="submit" size="sm" variant="outline" className="w-full">
                            → {tst(NEXT[col]!)}
                          </Button>
                        </form>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

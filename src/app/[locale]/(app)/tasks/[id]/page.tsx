import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, can } from "@/server/authz";
import { getTaskDetail } from "@/server/services/task";
import { listAssignableUsers } from "@/server/services/project";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, CheckCircle2, Circle, Plus } from "lucide-react";
import {
  updateTaskAction,
  addTaskCommentAction,
  addChecklistItemAction,
  toggleChecklistItemAction,
} from "../actions";

const STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "AWAITING_REVIEW", "COMPLETED", "CANCELLED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

function d(date: Date | null | undefined) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("task");
  const tst = await getTranslations("task.statuses");
  const tpr = await getTranslations("task.priorities");

  const data = await getTaskDetail(ctx, id);
  if (!data) notFound();
  const { task, comments } = data;
  const canManage = can(ctx, "task:manage");
  const assignable = canManage ? await listAssignableUsers(ctx) : [];

  const update = updateTaskAction.bind(null, locale);
  const comment = addTaskCommentAction.bind(null, locale);
  const addItem = addChecklistItemAction.bind(null, locale);
  const toggleItem = toggleChecklistItemAction.bind(null, locale);
  const doneCount = task.checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-6">
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t("title")}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{task.title}</h1>
        <StatusBadge status={task.status} label={tst(task.status)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main: description + checklist + comments */}
        <div className="space-y-6 lg:col-span-2">
          {task.description ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("description")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{task.description}</p>
              </CardContent>
            </Card>
          ) : null}

          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("checklist")}{" "}
                {task.checklist.length > 0 ? (
                  <span className="text-sm font-normal text-muted-foreground">
                    {doneCount}/{task.checklist.length}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {task.checklist.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noChecklist")}</p>
              ) : (
                task.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <form action={toggleItem}>
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <button type="submit" className="flex">
                        {item.done ? (
                          <CheckCircle2 className="size-4 text-success" />
                        ) : (
                          <Circle className="size-4 text-muted-foreground" />
                        )}
                      </button>
                    </form>
                    <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
                  </div>
                ))
              )}
              {canManage ? (
                <form action={addItem} className="flex gap-2 border-t pt-3">
                  <input type="hidden" name="id" value={task.id} />
                  <Input name="label" placeholder={t("addChecklistItem")} required className="h-9" />
                  <Button type="submit" size="sm" variant="outline">
                    <Plus className="size-4" />
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("comments")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noComments")}</p>
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
                <input type="hidden" name="id" value={task.id} />
                <Textarea name="body" placeholder={t("addComment")} required rows={1} className="min-h-10" />
                <Button type="submit" variant="outline">
                  {t("post")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: editable details */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{t("details")}</CardTitle>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <form action={update} className="space-y-3">
                <input type="hidden" name="id" value={task.id} />
                <div>
                  <Label htmlFor="title">{t("taskTitle")}</Label>
                  <Input id="title" name="title" defaultValue={task.title} required />
                </div>
                <div>
                  <Label htmlFor="status">{t("status")}</Label>
                  <select id="status" name="status" defaultValue={task.status} className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{tst(s)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="priority">{t("priority")}</Label>
                  <select id="priority" name="priority" defaultValue={task.priority} className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{tpr(p)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="assigneeId">{t("assignee")}</Label>
                  <select id="assigneeId" name="assigneeId" defaultValue={task.assigneeId ?? ""} className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">{t("unassigned")}</option>
                    {assignable.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="dueDate">{t("dueDate")}</Label>
                  <Input id="dueDate" name="dueDate" type="date" defaultValue={d(task.dueDate)} />
                </div>
                <div>
                  <Label htmlFor="description">{t("description")}</Label>
                  <Textarea id="description" name="description" defaultValue={task.description ?? ""} />
                </div>
                <Button type="submit" className="w-full">{t("save")}</Button>
              </form>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("priority")}</dt>
                  <dd>{tpr(task.priority)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("assignee")}</dt>
                  <dd>{task.assignee?.name ?? t("unassigned")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("project")}</dt>
                  <dd>{task.project.name}</dd>
                </div>
                {task.dueDate ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("dueDate")}</dt>
                    <dd>{formatDate(task.dueDate, locale)}</dd>
                  </div>
                ) : null}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

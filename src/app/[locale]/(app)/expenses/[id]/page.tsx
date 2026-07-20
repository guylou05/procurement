import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, can } from "@/server/authz";
import { getExpenseDetail } from "@/server/services/expense";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, Check, X, Send, BadgeCheck } from "lucide-react";
import {
  decideExpenseAction,
  submitExpenseAction,
  markReimbursedAction,
  uploadReceiptAction,
} from "../actions";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("expense");
  const ts = await getTranslations("expense.statuses");
  const tm = await getTranslations("expense.methods");

  const data = await getExpenseDetail(ctx, id);
  if (!data) notFound();
  const { expense, submittedByName, approvedByName } = data;
  const canApprove = can(ctx, "expense:approve");
  const canRecord = can(ctx, "expense:record");
  const isImage = expense.receiptUrl && !expense.receiptUrl.endsWith(".pdf");

  const decide = decideExpenseAction.bind(null, locale);
  const submit = submitExpenseAction.bind(null, locale);
  const reimburse = markReimbursedAction.bind(null, locale);
  const uploadReceipt = uploadReceiptAction.bind(null, locale);

  const rows = [
    { label: t("vendor"), value: expense.vendor ?? "—" },
    { label: t("date"), value: formatDate(expense.date, locale) },
    { label: t("paymentMethod"), value: tm(expense.paymentMethod) },
    { label: t("project"), value: expense.project?.name ?? "—" },
    { label: t("category"), value: expense.category?.name ?? "—" },
    { label: t("submittedBy"), value: submittedByName ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <Link href="/expenses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        {t("back")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{formatMoney(expense.amountMinor, expense.currency, locale)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {expense.vendor ?? "—"} · {formatDate(expense.date, locale)}
          </p>
        </div>
        <StatusBadge status={expense.status} label={ts(expense.status)} />
      </div>

      {/* Workflow actions */}
      <div className="flex flex-wrap gap-2">
        {expense.status === "DRAFT" && canRecord ? (
          <form action={submit}>
            <input type="hidden" name="id" value={expense.id} />
            <Button type="submit">
              <Send className="size-4" />
              {t("submit")}
            </Button>
          </form>
        ) : null}
        {expense.status === "APPROVED" && canApprove ? (
          <form action={reimburse}>
            <input type="hidden" name="id" value={expense.id} />
            <Button type="submit" variant="outline">
              <BadgeCheck className="size-4" />
              {t("markReimbursed")}
            </Button>
          </form>
        ) : null}
      </div>

      {/* Approval panel for submitted expenses */}
      {expense.status === "SUBMITTED" && canApprove ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("review")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Two separate forms: React Server Actions don't reliably include a
                clicked submit button's value, so the approve/reject decision is a
                hidden field per form, not a button value. */}
            <form action={decide} className="flex items-end gap-2">
              <input type="hidden" name="id" value={expense.id} />
              <input type="hidden" name="approve" value="false" />
              <div className="flex-1">
                <Label htmlFor="rejectionReason">{t("reviewNote")}</Label>
                <Input id="rejectionReason" name="rejectionReason" />
              </div>
              <Button type="submit" variant="destructive">
                <X className="size-4" />
                {t("reject")}
              </Button>
            </form>
            <form action={decide}>
              <input type="hidden" name="id" value={expense.id} />
              <input type="hidden" name="approve" value="true" />
              <Button type="submit">
                <Check className="size-4" />
                {t("approve")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {expense.status === "REJECTED" && expense.rejectionReason ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <span className="font-medium">{t("rejectedReason")}:</span> {expense.rejectionReason}
        </div>
      ) : null}

      {approvedByName ? (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <span className="font-medium">{t("approvedBy")}:</span> {approvedByName}
          {expense.approvedAt ? ` · ${formatDate(expense.approvedAt, locale)}` : ""}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("detail")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.label}>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">{r.label}</dt>
                  <dd className="mt-0.5 text-sm">{r.value}</dd>
                </div>
              ))}
            </dl>
            {expense.description ? (
              <div className="mt-4 border-t pt-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">{t("description")}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm">{expense.description}</dd>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Receipt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("receipt")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expense.receiptUrl ? (
              isImage ? (
                <a href={expense.receiptUrl} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={expense.receiptUrl} alt={t("receipt")} className="max-h-64 rounded-md border object-contain" />
                </a>
              ) : (
                <a href={expense.receiptUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                  {t("viewReceipt")}
                </a>
              )
            ) : (
              <p className="text-sm text-muted-foreground">{t("noReceipt")}</p>
            )}
            {canRecord ? (
              <form action={uploadReceipt} className="flex flex-wrap items-center gap-2 border-t pt-3">
                <input type="hidden" name="id" value={expense.id} />
                <input type="file" name="receipt" accept="image/jpeg,image/png,image/webp,application/pdf" required className="text-sm" />
                <Button type="submit" size="sm" variant="outline">
                  {t("upload")}
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

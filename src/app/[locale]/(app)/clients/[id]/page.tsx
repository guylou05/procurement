import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, can } from "@/server/authz";
import { getClientHub } from "@/server/services/client";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Pencil, FolderKanban, Receipt, Wallet, TrendingUp } from "lucide-react";

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("client");
  const tp = await getTranslations("project.statuses");
  const ti = await getTranslations("invoice.statuses");

  const data = await getClientHub(ctx, id);
  if (!data) notFound();
  const { client, projects, invoices, currency, stats } = data;
  const canManage = can(ctx, "client:manage");
  const money = (n: number) => formatMoney(n, currency, locale);

  const kpis = [
    { label: t("projects"), value: String(stats.projectCount), icon: FolderKanban },
    { label: t("totalInvoiced"), value: money(stats.totalInvoicedMinor), icon: Receipt },
    { label: t("totalPaid"), value: money(stats.totalPaidMinor), icon: Wallet },
    { label: t("outstanding"), value: money(stats.outstandingMinor), icon: TrendingUp },
  ];

  const contact = [
    { label: t("company"), value: client.company },
    { label: t("email"), value: client.email },
    { label: t("phone"), value: client.phone },
    { label: t("whatsapp"), value: client.whatsapp },
    { label: t("billingAddress"), value: client.billingAddress },
  ].filter((r) => r.value);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.company ? <p className="mt-1 text-sm text-muted-foreground">{client.company}</p> : null}
        </div>
        {canManage ? (
          <Button asChild variant="outline">
            <Link href={`/clients/${client.id}/edit`}>
              <Pencil className="size-4" />
              {t("edit")}
            </Link>
          </Button>
        ) : null}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
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
        {/* Contact + notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("contact")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              contact.map((r) => (
                <div key={r.label}>
                  <p className="text-xs font-medium uppercase text-muted-foreground">{r.label}</p>
                  <p className="mt-0.5 text-sm">{r.value}</p>
                </div>
              ))
            )}
            {client.notes ? (
              <div className="border-t pt-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">{t("notes")}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{client.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("projects")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noProjects")}</p>
            ) : (
              projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/projects/${p.id}`} className="truncate hover:underline">
                    {p.name}
                  </Link>
                  <StatusBadge status={p.status} label={tp(p.status)} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("invoices")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noInvoices")}</p>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                      {inv.number}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {money(inv.paidMinor)} {t("paid")} · {formatDate(inv.issueDate, locale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>{money(inv.totalMinor)}</p>
                    <StatusBadge status={inv.status} label={ti(inv.status)} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

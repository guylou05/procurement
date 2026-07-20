import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { listClients } from "@/server/services/client";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus } from "lucide-react";

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("client");
  const clients = await listClients(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {can(ctx, "client:manage") ? (
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="size-4" />
              {t("new")}
            </Link>
          </Button>
        ) : null}
      </div>

      {clients.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("name")}</th>
                  <th className="px-4 py-3 font-medium">{t("company")}</th>
                  <th className="px-4 py-3 font-medium">{t("phone")}</th>
                  <th className="px-4 py-3 font-medium">{t("email")}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/clients/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.company ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/server/authz";
import { listPlatformAuditLog } from "@/server/services/admin";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";

export default async function AdminAuditLogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin(locale);
  const t = await getTranslations("admin");
  const tc = await getTranslations("admin.auditColumns");
  const entries = await listPlatformAuditLog(200);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("auditLog")}</h1>

      {entries.length === 0 ? (
        <EmptyState title={t("auditEmpty")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{tc("when")}</th>
                  <th className="px-4 py-3 font-medium">{tc("who")}</th>
                  <th className="px-4 py-3 font-medium">{tc("org")}</th>
                  <th className="px-4 py-3 font-medium">{tc("action")}</th>
                  <th className="px-4 py-3 font-medium">{tc("record")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDate(e.createdAt, locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">{e.user?.name ?? e.user?.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.organization?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.recordType}
                      {e.recordId ? ` · ${e.recordId.slice(0, 8)}` : ""}
                    </td>
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

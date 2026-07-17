import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { listMembers, listInvitations } from "@/server/services/team";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { InviteForm } from "./invite-form";
import { revokeInvitationAction } from "./actions";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("team");
  const tr = await getTranslations("team.roles");
  const [members, invitations] = await Promise.all([listMembers(ctx), listInvitations(ctx)]);
  const canManage = can(ctx, "org:members");
  const revoke = revokeInvitationAction.bind(null, locale);
  const appUrl = process.env.APP_URL ?? "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("invite")}</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteForm locale={locale} appUrl={appUrl} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("members")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("name")}</th>
                  <th className="px-4 py-3 font-medium">{t("email")}</th>
                  <th className="px-4 py-3 font-medium">{t("role")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{m.user.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.user.email}</td>
                    <td className="px-4 py-3">
                      <Badge tone="primary">{tr(m.role)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("pendingInvites")}</CardTitle>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <EmptyState title={t("empty")} />
            ) : (
              <div className="space-y-2">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{inv.email}</span>
                      <Badge tone="neutral" className="ml-2">
                        {tr(inv.role)}
                      </Badge>
                    </div>
                    <form action={revoke}>
                      <input type="hidden" name="id" value={inv.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        {t("revoke")}
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/server/auth";
import { getInvitationByToken } from "@/server/services/team";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "./actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("team");
  const tr = await getTranslations("team.roles");

  const invite = await getInvitationByToken(token);
  const session = await auth();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Card>
        {!invite ? (
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("inviteInvalid")}
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-xl">
                {t("acceptTitle", { org: invite.organization.name })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {invite.email} · {tr(invite.role)}
              </p>
              {session?.user?.id ? (
                <form action={acceptInviteAction.bind(null, locale, token)}>
                  <Button type="submit" className="w-full">
                    {t("acceptCta")}
                  </Button>
                </form>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm">{t("signInToAccept", { email: invite.email })}</p>
                  <div className="flex gap-3">
                    <Button asChild variant="outline" className="flex-1">
                      <Link href="/login">{t("acceptCta")}</Link>
                    </Button>
                    <Button asChild className="flex-1">
                      <Link href="/register">{t("acceptCta")}</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

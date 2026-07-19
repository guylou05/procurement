import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { getTenantContext, hasOnlySuspendedMemberships } from "@/server/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { brand } from "@/config/brand";
import { Ban } from "lucide-react";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SuspendedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("suspended");

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  // Guard against reaching this page in any other state (active org, or none at all).
  const ctx = await getTenantContext();
  if (ctx) redirect(`/${locale}/dashboard`);
  if (!(await hasOnlySuspendedMemberships(session.user.id))) redirect(`/${locale}/onboarding`);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-2 grid size-12 place-items-center rounded-full bg-destructive/10">
            <Ban className="size-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{t("body")}</p>
          <Button asChild variant="outline" className="w-full">
            <a href={`mailto:${brand.supportEmail}`}>{t("contact")}</a>
          </Button>
          <div className="flex justify-center pt-2">
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

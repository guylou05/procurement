import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { getTenantContext } from "@/server/tenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { COUNTRIES, CURRENCIES } from "@/config/countries";
import { createOrganizationAction } from "./actions";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  // If the user already has an organization, skip onboarding.
  const existing = await getTenantContext();
  if (existing) redirect(`/${locale}/dashboard`);

  const t = await getTranslations("onboarding");

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createOrganizationAction} className="space-y-4">
            <div>
              <Label htmlFor="name">{t("businessName")}</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="country">{t("country")}</Label>
                <select
                  id="country"
                  name="country"
                  required
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {locale === "fr" ? c.nameFr : c.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="currency">{t("currency")}</Label>
                <select
                  id="currency"
                  name="currency"
                  required
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="defaultLocale">{t("language")}</Label>
                <select
                  id="defaultLocale"
                  name="defaultLocale"
                  defaultValue={locale}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              <div>
                <Label htmlFor="industry">{t("industry")}</Label>
                <Input id="industry" name="industry" />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" name="phone" />
            </div>
            <div>
              <Label htmlFor="address">{t("address")}</Label>
              <Textarea id="address" name="address" />
            </div>
            <Button type="submit" className="w-full">
              {t("create")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

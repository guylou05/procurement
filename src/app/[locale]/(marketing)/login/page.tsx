import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("signIn")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm locale={locale} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              {t("registerCta")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

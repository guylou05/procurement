import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { brand } from "@/config/brand";
import { Smartphone, Languages, ShieldCheck } from "lucide-react";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  const features = [
    { icon: Smartphone, text: t("features.mobile") },
    { icon: Languages, text: t("features.bilingual") },
    { icon: ShieldCheck, text: t("features.multitenant") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-md bg-primary font-bold text-primary-foreground">
            B
          </div>
          <span className="font-semibold">{brand.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t("signIn")}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("heroTitle")}</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{t("heroSubtitle")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/register">{t("getStarted")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">{t("signIn")}</Link>
          </Button>
        </div>

        <div className="mt-14 grid w-full gap-4 sm:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.text} className="rounded-lg border bg-card p-5 text-left">
                <Icon className="mb-3 size-5 text-primary" />
                <p className="text-sm font-medium">{f.text}</p>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {brand.name}
      </footer>
    </div>
  );
}

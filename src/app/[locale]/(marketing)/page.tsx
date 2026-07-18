import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { brand, getSiteUrl } from "@/config/brand";
import { COUNTRIES } from "@/config/countries";
import {
  Smartphone,
  Languages,
  ShieldCheck,
  WifiOff,
  ClipboardList,
  UserCheck,
  FolderKanban,
  Package,
  Receipt,
  Wrench,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const isFr = locale === "fr";
  const siteUrl = getSiteUrl();

  const trustBar = [
    { icon: Smartphone, text: t("trustBar.mobile") },
    { icon: Languages, text: t("trustBar.bilingual") },
    { icon: ShieldCheck, text: t("trustBar.secure") },
    { icon: WifiOff, text: t("trustBar.offline") },
  ];

  const features = [
    { icon: ClipboardList, key: "dailyReports" },
    { icon: UserCheck, key: "attendance" },
    { icon: FolderKanban, key: "projects" },
    { icon: Package, key: "materials" },
    { icon: Receipt, key: "expenses" },
    { icon: Wrench, key: "equipment" },
    { icon: Users, key: "portal" },
    { icon: ShieldCheck, key: "team" },
  ] as const;

  const steps = ["one", "two", "three", "four"] as const;
  const faqKeys = ["q1", "q2", "q3", "q4", "q5"] as const;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqKeys.map((k) => ({
      "@type": "Question",
      name: t(`faq.${k}`),
      acceptedAnswer: { "@type": "Answer", text: t(`faq.a${k.slice(1)}`) },
    })),
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: brand.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${siteUrl}/${locale}`,
    description: isFr ? brand.description.fr : brand.description.en,
    inLanguage: ["en", "fr"],
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-md bg-primary font-bold text-primary-foreground">
              B
            </div>
            <span className="font-semibold">{brand.name}</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">{t("nav.features")}</a>
            <a href="#how-it-works" className="hover:text-foreground">{t("nav.howItWorks")}</a>
            <a href="#markets" className="hover:text-foreground">{t("nav.markets")}</a>
            <a href="#faq" className="hover:text-foreground">{t("nav.faq")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">{t("signIn")}</Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/register">{t("getStarted")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_-10%,hsl(var(--primary)/0.15),transparent_50%),radial-gradient(circle_at_90%_10%,hsl(var(--accent)/0.12),transparent_45%)]"
        />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center lg:px-8 lg:py-28">
          <span className="inline-flex items-center rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            {t("badge")}
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                {t("getStarted")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how-it-works">{t("seeHowItWorks")}</a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t("heroNote")}</p>

          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {trustBar.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.text}
                  className="flex flex-col items-center gap-2 rounded-lg border bg-card px-3 py-4 text-center"
                >
                  <Icon className="size-5 text-primary" />
                  <span className="text-xs font-medium">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">{t("featuresTitle")}</h2>
            <p className="mt-4 text-muted-foreground">{t("featuresSubtitle")}</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.key}>
                  <CardContent className="pt-6">
                    <div className="mb-3 grid size-10 place-items-center rounded-lg bg-primary/10">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{t(`features.${f.key}.title`)}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {t(`features.${f.key}.desc`)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">{t("howItWorksTitle")}</h2>
            <p className="mt-4 text-muted-foreground">{t("howItWorksSubtitle")}</p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s} className="relative">
                <div className="mb-3 grid size-10 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="font-semibold">{t(`steps.${s}.title`)}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{t(`steps.${s}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Markets */}
      <section id="markets" className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight">{t("marketsTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{t("marketsSubtitle")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {COUNTRIES.map((c) => (
              <span
                key={c.code}
                className="rounded-full border bg-card px-3 py-1.5 text-sm font-medium"
              >
                {isFr ? c.nameFr : c.nameEn}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight">{t("faqTitle")}</h2>
          <div className="mt-10 space-y-6">
            {faqKeys.map((k) => (
              <div key={k} className="border-b pb-6 last:border-0">
                <h3 className="flex items-start gap-2 font-semibold">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  {t(`faq.${k}`)}
                </h3>
                <p className="mt-2 pl-6 text-sm text-muted-foreground">
                  {t(`faq.a${k.slice(1)}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t bg-secondary py-20 text-secondary-foreground">
        <div className="mx-auto max-w-2xl px-4 text-center lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight">{t("ctaTitle")}</h2>
          <p className="mt-4 text-secondary-foreground/80">{t("ctaSubtitle")}</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/register">
              {t("ctaButton")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-10 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded bg-primary text-xs font-bold text-primary-foreground">
              B
            </div>
            <span className="text-sm font-medium">{brand.name}</span>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} {brand.name}. {t("footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}

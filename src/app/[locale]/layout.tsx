import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { brand, getSiteUrl } from "@/config/brand";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFr = locale === "fr";
  const siteUrl = getSiteUrl();
  const tagline = isFr ? brand.tagline.fr : brand.tagline.en;
  const description = isFr ? brand.description.fr : brand.description.en;
  const keywords = isFr ? brand.keywords.fr : brand.keywords.en;

  return {
    metadataBase: new URL(siteUrl),
    title: { default: `${brand.name} — ${tagline}`, template: `%s — ${brand.name}` },
    description,
    keywords: [...keywords],
    manifest: "/manifest.webmanifest",
    applicationName: brand.name,
    themeColor: brand.themeColor,
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages: {
        en: `${siteUrl}/en`,
        fr: `${siteUrl}/fr`,
        "x-default": `${siteUrl}/en`,
      },
    },
    openGraph: {
      type: "website",
      url: `${siteUrl}/${locale}`,
      siteName: brand.name,
      title: `${brand.name} — ${tagline}`,
      description,
      locale: isFr ? "fr_FR" : "en_US",
      alternateLocale: isFr ? "en_US" : "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: `${brand.name} — ${tagline}`,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

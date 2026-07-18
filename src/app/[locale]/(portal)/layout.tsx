import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/server/authz";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { brand } from "@/config/brand";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Client portal shell — deliberately minimal (no internal sidebar/nav). Any
 * authenticated user may load it, but the portal services only ever return data for
 * the Client record linked to this user, so staff without a linked client see nothing.
 */
export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("portal");

  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-md bg-primary font-bold text-primary-foreground">
            B
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{brand.shortName}</p>
            <p className="text-xs text-muted-foreground">{t("title")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-4 lg:p-8">{children}</main>
      <p className="pb-6 text-center text-xs text-muted-foreground">{ctx.organization.name}</p>
    </div>
  );
}

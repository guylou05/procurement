import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/server/authz";
import { Link } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { brand } from "@/config/brand";
import { LayoutDashboard, Building2, ScrollText } from "lucide-react";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// See (app)/layout.tsx for why this is required: auth-dependent segments must never
// be left to Next's static/dynamic inference.
export const dynamic = "force-dynamic";

/**
 * Platform admin shell — deliberately separate from the org sidebar. Every page
 * under this layout is gated by requireSuperAdmin(), independent of any
 * organization membership.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await requireSuperAdmin(locale);
  const t = await getTranslations("admin");

  const nav = [
    { href: "/admin", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/admin/organizations", label: t("organizations"), icon: Building2 },
    { href: "/admin/audit-log", label: t("auditLog"), icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-secondary text-secondary-foreground">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-md bg-primary font-bold text-primary-foreground">
              B
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">{brand.shortName}</p>
              <p className="text-xs text-secondary-foreground/70">{t("title")}</p>
            </div>
          </div>
          <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:opacity-80">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="border-b bg-card px-4 py-2 text-center text-xs text-muted-foreground lg:px-8">
        {t("signInAsAdmin")} — {admin.userEmail}
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}

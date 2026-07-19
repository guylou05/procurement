import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireAuth } from "@/server/authz";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

// Authenticated app — never indexed, even if a page is somehow reached without auth.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let ctx;
  try {
    ctx = await requireAuth(locale);
  } catch (err) {
    // requireAuth() itself throws Next's special redirect signal on the normal
    // unauthenticated path (digest starts with "NEXT_REDIRECT") — that's expected
    // control flow, not a bug, so only log genuine errors before rethrowing either way.
    const digest = (err as { digest?: string })?.digest;
    if (!digest?.startsWith("NEXT_REDIRECT")) {
      console.error("[AppLayout] requireAuth failed:", err);
    }
    throw err;
  }

  // Clients never see the internal app — send them to their portal.
  if (ctx.role === "CLIENT") redirect(`/${locale}/portal`);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar orgName={ctx.organization.name} userName={ctx.userName} />
        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}

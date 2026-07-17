import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/server/authz";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);

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

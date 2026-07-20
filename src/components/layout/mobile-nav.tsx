"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Home, FolderKanban, UserCheck, ClipboardList, Menu, X } from "lucide-react";
import { MAIN_NAV } from "@/config/navigation";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { cn } from "@/lib/utils";

// The four primary destinations shown as bottom-bar tabs; everything else in
// MAIN_NAV is reachable through the "More" sheet.
const PRIMARY = [
  { href: "/dashboard", key: "home", icon: Home },
  { href: "/projects", key: "projects", icon: FolderKanban },
  { href: "/attendance", key: "checkIn", icon: UserCheck },
  { href: "/daily-reports", key: "report", icon: ClipboardList },
] as const;

const PRIMARY_HREFS = new Set(PRIMARY.map((i) => i.href));

export function MobileNav() {
  const t = useTranslations("nav.mobile");
  const tn = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the sheet whenever the route changes (e.g. after tapping a link).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // The path is /<locale>/<section>/…; highlight "More" when the current section
  // isn't one of the primary tabs.
  const section = "/" + (pathname.split("/")[2] ?? "");
  const onMoreRoute = !PRIMARY_HREFS.has(section as (typeof PRIMARY)[number]["href"]);

  return (
    <>
      {/* Full navigation sheet */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={tn("mobile.close")}
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t bg-card p-4 pb-8 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">{t("more")}</span>
              <button
                type="button"
                aria-label={tn("mobile.close")}
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MAIN_NAV.map((item) => {
                const active = pathname.includes(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-xs font-medium",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-5" />
                    {tn(item.labelKey)}
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 border-t pt-4">
              <SignOutButton labelled />
            </div>
          </div>
        </div>
      ) : null}

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card lg:hidden">
        {PRIMARY.map((item) => {
          const active = pathname.includes(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-xs font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {t(item.key)}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex flex-col items-center gap-1 py-2 text-xs font-medium",
            onMoreRoute ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Menu className="size-5" />
          {t("more")}
        </button>
      </nav>
    </>
  );
}

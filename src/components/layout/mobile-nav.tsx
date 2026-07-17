"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Home, FolderKanban, UserCheck, ClipboardList, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", key: "home", icon: Home },
  { href: "/projects", key: "projects", icon: FolderKanban },
  { href: "/attendance", key: "checkIn", icon: UserCheck },
  { href: "/daily-reports", key: "report", icon: ClipboardList },
  { href: "/settings", key: "more", icon: Menu },
] as const;

export function MobileNav() {
  const t = useTranslations("nav.mobile");
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card lg:hidden">
      {ITEMS.map((item) => {
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
    </nav>
  );
}

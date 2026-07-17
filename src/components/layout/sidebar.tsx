"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { MAIN_NAV } from "@/config/navigation";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <div className="grid size-8 place-items-center rounded-md bg-primary font-bold text-primary-foreground">
          B
        </div>
        <span className="font-semibold">{brand.shortName}</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {MAIN_NAV.map((item) => {
          const active = pathname.includes(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

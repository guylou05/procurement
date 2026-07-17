"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  function switchTo(next: "en" | "fr") {
    if (next === locale) return;
    // Preserve the current route and params across the locale change.
    router.replace(
      // @ts-expect-error next-intl typed routes accept params passthrough
      { pathname, params },
      { locale: next },
    );
  }

  return (
    <div className={cn("inline-flex overflow-hidden rounded-md border text-sm", className)}>
      {(["en", "fr"] as const).map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          className={cn(
            "px-3 py-1.5 font-medium uppercase transition-colors",
            l === locale ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
          aria-current={l === locale}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { exitImpersonationAction } from "@/server/actions/impersonation";
import { Eye } from "lucide-react";

/**
 * Persistent banner shown across the app while a platform super admin is impersonating
 * an organization, so the impersonated context is never ambiguous. The exit button
 * clears the impersonation cookie and returns to the admin panel.
 */
export async function ImpersonationBanner({
  orgName,
  locale,
}: {
  orgName: string;
  locale: string;
}) {
  const t = await getTranslations("admin");
  return (
    <div className="flex items-center justify-between gap-3 bg-warning px-4 py-2 text-sm text-warning-foreground">
      <div className="flex items-center gap-2">
        <Eye className="size-4 shrink-0" />
        <span>{t("impersonateBanner", { org: orgName })}</span>
      </div>
      <form action={exitImpersonationAction}>
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" size="sm" variant="secondary">
          {t("exitImpersonation")}
        </Button>
      </form>
    </div>
  );
}

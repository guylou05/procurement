"use client";

import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton({ labelled = false }: { labelled?: boolean }) {
  const t = useTranslations("nav");
  const locale = useLocale();

  function handleSignOut() {
    // Build the post-logout URL from the current browser origin rather than letting
    // NextAuth infer a base URL — otherwise it can fall back to localhost:3000 in
    // production. window.location.origin is always the host the user is really on.
    const callbackUrl = `${window.location.origin}/${locale}/login`;
    void signOut({ callbackUrl });
  }

  if (labelled) {
    return (
      <Button variant="outline" className="w-full justify-start gap-3" onClick={handleSignOut}>
        <LogOut className="size-4" />
        {t("signOut")}
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon" title={t("signOut")} onClick={handleSignOut}>
      <LogOut className="size-4" />
    </Button>
  );
}

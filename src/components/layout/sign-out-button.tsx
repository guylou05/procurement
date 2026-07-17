"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const t = useTranslations("nav");
  return (
    <Button variant="ghost" size="icon" title={t("signOut")} onClick={() => signOut()}>
      <LogOut className="size-4" />
    </Button>
  );
}

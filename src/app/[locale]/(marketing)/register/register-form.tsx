"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { registerAction, type RegisterState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const activeLocale = useLocale();
  const router = useRouter();
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerAction,
    {},
  );

  useEffect(() => {
    if (state.success) {
      router.push(`/${locale}/login`);
    }
  }, [state.success, locale, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={activeLocale} />
      <div>
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">{tv("passwordLength")}</p>
      </div>
      {state.error === "EMAIL_TAKEN" ? (
        <p className="text-sm text-destructive">{t("email")} — {state.error}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {t("registerCta")}
      </Button>
    </form>
  );
}

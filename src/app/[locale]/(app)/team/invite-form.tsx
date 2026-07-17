"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { inviteMemberAction, type InviteState } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const ROLES = ["ADMIN", "PROJECT_MANAGER", "SUPERVISOR", "WORKER", "ACCOUNTANT", "CLIENT"] as const;

export function InviteForm({ locale, appUrl }: { locale: string; appUrl: string }) {
  const t = useTranslations("team");
  const tr = useTranslations("team.roles");
  const action = inviteMemberAction.bind(null, locale);
  const [state, formAction, pending] = useActionState<InviteState, FormData>(action, {});

  const inviteUrl = state.token ? `${appUrl}/${locale}/invite/${state.token}` : null;

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="role">{t("role")}</Label>
          <select
            id="role"
            name="role"
            defaultValue="SUPERVISOR"
            className="flex h-11 rounded-md border border-input bg-background px-3 text-base"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tr(r)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {t("sendInvite")}
        </Button>
      </form>

      {inviteUrl ? (
        <div className="rounded-md border bg-muted/40 p-3">
          <p className="text-sm font-medium">{t("inviteLink")}</p>
          <p className="mt-1 break-all text-sm text-primary">{inviteUrl}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("copyHint")}</p>
        </div>
      ) : null}
    </div>
  );
}

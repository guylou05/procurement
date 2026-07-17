import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, can } from "@/server/authz";
import { getOrgWithSettings } from "@/server/services/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateOrganizationAction, updateLocaleAction } from "./actions";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  const t = await getTranslations("settings");
  const { org, approvalThresholdMajor } = await getOrgWithSettings(ctx);
  const canManage = can(ctx, "org:manage");
  const orgAction = updateOrganizationAction.bind(null, locale);
  const localeAction = updateLocaleAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("organization")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={orgAction} className="space-y-4">
              <div>
                <Label htmlFor="name">{t("businessName")}</Label>
                <Input id="name" name="name" defaultValue={org.name} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <Input id="phone" name="phone" defaultValue={org.phone ?? ""} />
                </div>
                <div>
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input id="email" name="email" type="email" defaultValue={org.email ?? ""} />
                </div>
              </div>
              <div>
                <Label htmlFor="industry">{t("industry")}</Label>
                <Input id="industry" name="industry" defaultValue={org.industry ?? ""} />
              </div>
              <div>
                <Label htmlFor="address">{t("address")}</Label>
                <Textarea id="address" name="address" defaultValue={org.address ?? ""} />
              </div>
              <div>
                <Label htmlFor="approvalThreshold">
                  {t("expenseThreshold")} ({org.currency})
                </Label>
                <Input
                  id="approvalThreshold"
                  name="approvalThreshold"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={approvalThresholdMajor}
                />
                <p className="mt-1 text-xs text-muted-foreground">{t("expenseThresholdHint")}</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="requireReportApproval"
                  defaultChecked={org.settings?.requireReportApproval ?? true}
                  className="size-4"
                />
                {t("requireReportApproval")}
              </label>
              <Button type="submit">{t("save")}</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={localeAction} className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="locale">{t("language")}</Label>
              <select
                id="locale"
                name="locale"
                defaultValue={locale}
                className="flex h-11 rounded-md border border-input bg-background px-3 text-base"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>
            <Button type="submit" variant="outline">
              {t("save")}
            </Button>
          </form>
          <p className="mt-3 text-sm text-muted-foreground">{ctx.userEmail}</p>
        </CardContent>
      </Card>
    </div>
  );
}

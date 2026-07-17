import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth, requirePermission } from "@/server/authz";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClientAction } from "../actions";

export default async function NewClientPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "client:manage");
  const t = await getTranslations("client");
  const action = createClientAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("new")}</h1>
      <Card>
        <CardContent className="pt-5">
          <form action={action} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">{t("name")}</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="company">{t("company")}</Label>
                <Input id="company" name="company" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input id="phone" name="phone" />
              </div>
              <div>
                <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
                <Input id="whatsapp" name="whatsapp" />
              </div>
              <div>
                <Label htmlFor="email">{t("email")}</Label>
                <Input id="email" name="email" type="email" />
              </div>
            </div>
            <Button type="submit" className="w-full">
              {t("new")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

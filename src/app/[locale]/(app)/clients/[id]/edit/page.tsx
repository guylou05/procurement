import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth, requirePermission } from "@/server/authz";
import { getClient } from "@/server/services/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateClientAction } from "../../actions";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "client:manage");
  const t = await getTranslations("client");
  const client = await getClient(ctx, id);
  if (!client) notFound();
  const action = updateClientAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("edit")}</h1>
      <Card>
        <CardContent className="pt-5">
          <form action={action} className="space-y-4">
            <input type="hidden" name="id" value={client.id} />
            <div>
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" name="name" defaultValue={client.name} required />
            </div>
            <div>
              <Label htmlFor="company">{t("company")}</Label>
              <Input id="company" name="company" defaultValue={client.company ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">{t("email")}</Label>
                <Input id="email" name="email" type="email" defaultValue={client.email ?? ""} />
              </div>
              <div>
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input id="phone" name="phone" defaultValue={client.phone ?? ""} />
              </div>
            </div>
            <div>
              <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
              <Input id="whatsapp" name="whatsapp" defaultValue={client.whatsapp ?? ""} />
            </div>
            <div>
              <Label htmlFor="billingAddress">{t("billingAddress")}</Label>
              <Textarea id="billingAddress" name="billingAddress" defaultValue={client.billingAddress ?? ""} />
            </div>
            <div>
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea id="notes" name="notes" defaultValue={client.notes ?? ""} />
            </div>
            <Button type="submit" className="w-full">
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/server/authz";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAuth(locale);
  const t = await getTranslations("nav");
  const ts = await getTranslations("common.states");
  return <ModulePlaceholder title={t("clients")} note={ts("empty")} />;
}

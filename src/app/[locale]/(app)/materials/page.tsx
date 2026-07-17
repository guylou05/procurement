import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/server/authz";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default async function MaterialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAuth(locale);
  const t = await getTranslations("nav");
  const ts = await getTranslations("common.states");
  return <ModulePlaceholder title={t("materials")} note={ts("empty")} />;
}

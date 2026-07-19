import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/brand";
import { routing } from "@/i18n/routing";

/** Public marketing pages only — the authenticated app, portal and admin are noindexed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const publicPaths = ["", "/login", "/register"];

  return publicPaths.map((path) => ({
    url: `${siteUrl}/en${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.5,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, `${siteUrl}/${locale}${path}`]),
      ),
    },
  }));
}

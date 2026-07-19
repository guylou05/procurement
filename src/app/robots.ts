import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/brand";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/*/dashboard",
        "/*/projects",
        "/*/daily-reports",
        "/*/tasks",
        "/*/attendance",
        "/*/workers",
        "/*/materials",
        "/*/expenses",
        "/*/equipment",
        "/*/issues",
        "/*/clients",
        "/*/invoices",
        "/*/reports",
        "/*/team",
        "/*/settings",
        "/*/onboarding",
        "/*/portal",
        "/*/admin",
        "/*/invite/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

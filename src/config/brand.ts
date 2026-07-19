/**
 * Central branding config. Swap these values to rebrand without touching feature code.
 * Colors live as CSS variables in src/app/globals.css (theme tokens).
 */
export const brand = {
  name: "BuildFlow Africa",
  shortName: "BuildFlow",
  tagline: {
    en: "Field operations for African builders",
    fr: "Gestion de chantier pour les bâtisseurs africains",
  },
  description: {
    en: "Mobile-first, bilingual field operations software for construction and service companies in Africa. Manage projects, attendance, daily site reports, materials, expenses and more — built for slow connections and non-technical teams.",
    fr: "Logiciel de gestion de chantier mobile et bilingue pour les entreprises de construction et de services en Afrique. Gérez projets, présence, rapports journaliers, matériaux, dépenses et plus — conçu pour les connexions lentes et les équipes non techniques.",
  },
  keywords: {
    en: [
      "construction management software Africa",
      "field operations app",
      "daily site report software",
      "attendance tracking construction",
      "contractor management software",
      "bilingual construction app",
      "site management Francophone Africa",
    ],
    fr: [
      "logiciel de gestion de chantier Afrique",
      "application de gestion de chantier",
      "rapport journalier de chantier",
      "suivi de présence ouvriers",
      "logiciel entrepreneur BTP",
      "application bilingue construction",
      "gestion de chantier Afrique francophone",
    ],
  },
  domain: "buildflow.africa",
  supportEmail: "support@buildflow.africa",
  themeColor: "#e8790f",
} as const;

export type Brand = typeof brand;

/** Absolute site URL for metadata (canonical links, OG, sitemap). */
export function getSiteUrl(): string {
  const url = process.env.APP_URL ?? `https://${brand.domain}`;
  return url.replace(/\/$/, "");
}

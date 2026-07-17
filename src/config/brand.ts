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
  domain: "buildflow.africa",
  supportEmail: "support@buildflow.africa",
} as const;

export type Brand = typeof brand;

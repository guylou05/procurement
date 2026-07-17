/**
 * Supported countries and currencies. Format defaults are locale-aware at render time;
 * this table drives onboarding selectors and sensible per-country defaults.
 */
export interface CountryOption {
  code: string;
  nameEn: string;
  nameFr: string;
  currency: string;
  timezone: string;
  defaultLocale: "en" | "fr";
}

export const COUNTRIES: CountryOption[] = [
  { code: "CM", nameEn: "Cameroon", nameFr: "Cameroun", currency: "XAF", timezone: "Africa/Douala", defaultLocale: "fr" },
  { code: "SN", nameEn: "Senegal", nameFr: "Sénégal", currency: "XOF", timezone: "Africa/Dakar", defaultLocale: "fr" },
  { code: "CI", nameEn: "Côte d'Ivoire", nameFr: "Côte d'Ivoire", currency: "XOF", timezone: "Africa/Abidjan", defaultLocale: "fr" },
  { code: "BJ", nameEn: "Benin", nameFr: "Bénin", currency: "XOF", timezone: "Africa/Porto-Novo", defaultLocale: "fr" },
  { code: "TG", nameEn: "Togo", nameFr: "Togo", currency: "XOF", timezone: "Africa/Lome", defaultLocale: "fr" },
  { code: "BF", nameEn: "Burkina Faso", nameFr: "Burkina Faso", currency: "XOF", timezone: "Africa/Ouagadougou", defaultLocale: "fr" },
  { code: "ML", nameEn: "Mali", nameFr: "Mali", currency: "XOF", timezone: "Africa/Bamako", defaultLocale: "fr" },
  { code: "GN", nameEn: "Guinea", nameFr: "Guinée", currency: "GNF", timezone: "Africa/Conakry", defaultLocale: "fr" },
  { code: "GA", nameEn: "Gabon", nameFr: "Gabon", currency: "XAF", timezone: "Africa/Libreville", defaultLocale: "fr" },
  { code: "CD", nameEn: "DR Congo", nameFr: "RD Congo", currency: "CDF", timezone: "Africa/Kinshasa", defaultLocale: "fr" },
  { code: "CG", nameEn: "Congo", nameFr: "Congo", currency: "XAF", timezone: "Africa/Brazzaville", defaultLocale: "fr" },
  { code: "RW", nameEn: "Rwanda", nameFr: "Rwanda", currency: "RWF", timezone: "Africa/Kigali", defaultLocale: "en" },
  { code: "KE", nameEn: "Kenya", nameFr: "Kenya", currency: "KES", timezone: "Africa/Nairobi", defaultLocale: "en" },
  { code: "GH", nameEn: "Ghana", nameFr: "Ghana", currency: "GHS", timezone: "Africa/Accra", defaultLocale: "en" },
  { code: "NG", nameEn: "Nigeria", nameFr: "Nigéria", currency: "NGN", timezone: "Africa/Lagos", defaultLocale: "en" },
  { code: "ZA", nameEn: "South Africa", nameFr: "Afrique du Sud", currency: "ZAR", timezone: "Africa/Johannesburg", defaultLocale: "en" },
  { code: "MA", nameEn: "Morocco", nameFr: "Maroc", currency: "MAD", timezone: "Africa/Casablanca", defaultLocale: "fr" },
  { code: "TN", nameEn: "Tunisia", nameFr: "Tunisie", currency: "TND", timezone: "Africa/Tunis", defaultLocale: "fr" },
];

export const CURRENCIES = [
  "XAF", "XOF", "NGN", "GHS", "KES", "ZAR", "MAD", "TND", "RWF", "GNF", "CDF", "USD", "EUR",
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

/** Currencies without minor units (store amounts as whole units). */
export const ZERO_DECIMAL_CURRENCIES = new Set(["XAF", "XOF", "RWF", "GNF", "CDF"]);

export function getCountry(code: string): CountryOption | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

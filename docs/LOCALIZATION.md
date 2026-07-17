# BuildFlow Africa — Localization Guide

- Framework: **next-intl**. Locales: `en` (default) + `fr`. Locale is a URL segment.
- Catalogs: `src/messages/en.json`, `src/messages/fr.json`. Keys must exist in both.
- **No hardcoded UI text.** Use `useTranslations('domain')` (client) or
  `getTranslations('domain')` (server).

## Key naming convention
`domain.subject.item` — e.g. `dailyReport.form.workCompleted`, `common.actions.save`,
`project.status.active`, `validation.required`.

Top-level domains: `common`, `nav`, `auth`, `onboarding`, `dashboard`, `project`,
`dailyReport`, `attendance`, `worker`, `task`, `material`, `expense`, `equipment`,
`issue`, `client`, `invoice`, `report`, `notification`, `settings`, `validation`, `email`.

## Natural business French (not word-for-word)
| English | French |
|---|---|
| Daily Site Report | Rapport journalier de chantier |
| Worker | Ouvrier / Travailleur (per context) |
| Foreman | Chef de chantier |
| Project Manager | Chef de projet |
| Materials | Matériaux |
| Equipment | Équipements |
| Attendance | Présence |
| Expense | Dépense |
| Purchase Order | Bon de commande |
| Client Portal | Portail client |

## Locale-aware formatting
Dates, times, numbers, currency and pluralization use `Intl` via next-intl. Currency
formatting also respects the organization's configured currency (see `src/lib/money.ts`).
User language preference is persisted (`UserPreference.locale`) and overrides the org
default for that user.

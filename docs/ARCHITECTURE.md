# BuildFlow Africa — Architecture Overview

> Working product name: **BuildFlow Africa**. Branding (name, logo, colors, domain)
> is centralized in `src/config/brand.ts` and `src/config/theme.css` so it can be
> changed without touching feature code.

## 1. Product summary

BuildFlow Africa is a mobile-first, multi-tenant SaaS for construction and field-service
companies operating in Africa. It digitizes the workflows that SMEs currently run over
WhatsApp, phone calls, paper notebooks and Excel: projects, job sites, field workers,
attendance, daily site reports, materials, expenses, equipment, tasks, issues, clients
and basic invoicing.

Design constraints that shape every decision:

- **Mobile-first / low bandwidth** — most field users are on smartphones and unstable networks.
- **Bilingual (English + French)** — i18n is built in from day one, never bolted on.
- **Multi-country** — currency, date, phone and tax formats vary per country/organization.
- **Simple for non-technical foremen**, while giving owners management visibility.

## 2. Recommended technical architecture

| Concern        | Choice                                             | Notes |
|----------------|----------------------------------------------------|-------|
| Framework      | Next.js (App Router) + React + TypeScript (strict) | Server Components + Server Actions |
| Styling        | Tailwind CSS + shadcn/ui-style primitives          | Design tokens in `theme.css` |
| Forms          | React Hook Form + Zod                              | Zod schemas shared client/server |
| Data fetching  | Server Components + Server Actions; TanStack Query for interactive client lists | |
| ORM / DB       | Prisma + PostgreSQL                                | Single DB, tenant column isolation |
| Auth           | Auth.js (NextAuth) — credentials + future OAuth    | JWT sessions, org membership in token |
| Storage        | S3-compatible adapter (AWS S3 / Cloudflare R2 / MinIO) | `src/lib/storage` abstraction |
| i18n           | next-intl                                          | `en`, `fr` message catalogs |
| Billing        | Provider adapter (Stripe / Paystack / Flutterwave / manual) | Not activated in MVP |
| Payments       | Provider adapter (Orange/MTN/Wave/M-Pesa/Stripe…)  | Manual recording in MVP |
| Deployment     | Docker + Docker Compose (dev) / container host + managed Postgres (prod) | Not coupled to one host |
| Testing        | Vitest (unit/integration) + Playwright (e2e, critical flows) | Tenant-isolation tests mandatory |

### Why this stack

A single Next.js app (server actions + route handlers) keeps the MVP simple to build,
deploy and operate for a small team, while Prisma + PostgreSQL give a strong relational
core. A NestJS backend was considered but rejected for the MVP: it adds a second
deployable and cross-service auth without a compelling need at this stage. If/when a
public API, heavy background processing, or native mobile clients demand it, the service
layer (`src/server/services/*`) is already framework-agnostic and can be lifted into a
dedicated API.

## 3. Multi-tenancy model

- Every business record carries an `organizationId` FK and is indexed on it.
- **Tenant isolation is enforced server-side**, never by frontend filtering.
- The authenticated session carries the user's `organizationId` and role. All data
  access goes through `src/server/tenant.ts` (`getTenantContext()`), which resolves the
  active organization from the session — **organization IDs are never trusted from the
  client**.
- Service functions accept a `TenantContext` and always scope queries by `organizationId`.
  See `src/server/services/` and the guard helpers in `src/server/authz.ts`.
- Prisma queries never run "raw" from a route without going through a scoped service.

Future scaling paths this leaves open: multiple branches (`Branch` entity already in
schema), multiple countries/currencies (per-org + per-project currency), subscription
billing & usage limits (`Plan`, `Subscription`, `UsageLimit`), white-labeling (brand
config per org), API integrations and native mobile apps.

## 4. Authorization

Role-based access control with granular permissions, designed so custom roles can be
added later.

- Roles: `SUPER_ADMIN`, `OWNER`, `ADMIN`, `PROJECT_MANAGER`, `SUPERVISOR`, `WORKER`,
  `ACCOUNTANT`, `CLIENT`.
- Permissions are enumerated in `src/server/permissions.ts` and mapped to roles in a
  matrix (see `docs/PERMISSION_MATRIX.md`). Authorization checks use `can(ctx, permission)`
  centrally — UI hides what a user cannot do, **and the server re-checks every mutation**.
- Clients only ever reach the Client Portal, scoped to explicitly shared projects.

## 5. Localization strategy

- `next-intl` with message catalogs at `src/messages/en.json` and `src/messages/fr.json`.
- All user-facing strings use translation keys; no hardcoded UI text.
- Key naming convention: `domain.subject.item` (e.g. `dailyReport.form.workCompleted`).
- Locale-aware dates, numbers, currency and pluralization via `Intl` + next-intl.
- Org has a default language; each user can override their own preference (`UserPreference`).
- French uses natural business terminology (e.g. *Rapport journalier de chantier*,
  *Chef de chantier*, *Bon de commande*) — see `docs/LOCALIZATION.md`.

## 6. Offline & low-bandwidth strategy (MVP)

- Installable **PWA** (manifest + service worker) caching the app shell and static assets.
- Client-side image compression before upload; upload progress + retry on interruption.
- Unfinished high-priority forms (attendance, daily report, issue, expense, photo)
  preserved in `localStorage`/IndexedDB so a dropped connection doesn't lose work.
- Skeleton loaders, clear offline indicator, lean JS bundles (Server Components by default).
- **We do not claim full offline sync** in the MVP — only draft preservation + queued
  retry for the priority forms. Full CRDT-style sync is documented as future work.

## 7. Security strategy

- Tenant isolation + server-side authorization on every mutation (IDOR/organization-switch
  protection: membership is validated, never inferred from a client-supplied id).
- Zod input validation on all server actions/route handlers.
- Secure file uploads: type + size validation, signed URLs for private files.
- Secure cookies, CSRF protection (Auth.js), password hashing (bcrypt/argon2),
  rate limiting on auth-sensitive endpoints.
- Audit logging of sensitive changes (`AuditLog`).
- Financial data and worker documents treated as sensitive; excluded from client portal.

## 8. Development phases

1. **Architecture plan** (this doc + companions) — done first, deliberately.
2. **Foundation** — Next.js/TS/Tailwind/Prisma/Auth/i18n/multi-tenancy/Docker/tooling.
3. **Design system** — reusable layout, nav, tables, forms, badges, states, uploaders.
4. **Core modules** — implemented one at a time (schema → migration → service → authz →
   validation → UI → translations → tests → seed → mobile check).
5. **Quality & deployment** — tests, a11y/perf/security review, Docker prod, docs.

See `docs/ROADMAP.md` for the module-by-module sequence and `docs/RISKS.md` for risks.

# BuildFlow Africa — Folder Structure

```
buildflow-africa/
├── docs/                          # Architecture & planning docs
├── prisma/
│   ├── schema.prisma              # Full relational schema (all entities)
│   └── seed.ts                    # Bilingual demo organization seed
├── public/
│   ├── manifest.webmanifest       # PWA manifest
│   └── icons/                     # App icons
├── messages/                      # (re-exported) — canonical catalogs in src/messages
├── src/
│   ├── app/
│   │   └── [locale]/
│   │       ├── (marketing)/       # Landing + auth pages
│   │       ├── (app)/             # Authenticated, org-scoped app
│   │       │   ├── dashboard/
│   │       │   ├── projects/
│   │       │   ├── daily-reports/
│   │       │   ├── tasks/
│   │       │   ├── attendance/
│   │       │   ├── workers/
│   │       │   ├── materials/
│   │       │   ├── expenses/
│   │       │   ├── equipment/
│   │       │   ├── issues/
│   │       │   ├── clients/
│   │       │   ├── invoices/
│   │       │   ├── reports/
│   │       │   ├── team/
│   │       │   └── settings/
│   │       ├── (portal)/          # Client portal
│   │       ├── (admin)/           # Super-admin
│   │       └── layout.tsx         # Locale provider + html shell
│   ├── components/
│   │   ├── ui/                    # shadcn-style primitives (button, card, input, …)
│   │   ├── layout/                # Sidebar, topbar, mobile bottom nav
│   │   └── shared/                # Language switcher, currency/date display, states
│   ├── config/
│   │   ├── brand.ts               # Name/logo/colors/domain (swappable)
│   │   ├── countries.ts           # Supported countries + currencies + formats
│   │   └── navigation.ts          # Nav definitions
│   ├── i18n/
│   │   ├── routing.ts             # next-intl locale routing config
│   │   └── request.ts             # per-request i18n config
│   ├── messages/
│   │   ├── en.json
│   │   └── fr.json
│   ├── lib/
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── money.ts               # Minor-unit money + locale formatting
│   │   ├── storage/               # S3/R2/MinIO adapter
│   │   └── utils.ts
│   ├── server/
│   │   ├── auth.ts                # Auth.js config
│   │   ├── tenant.ts              # getTenantContext() — org from session
│   │   ├── authz.ts               # can()/require() guards
│   │   ├── permissions.ts         # Permission enum + role→permission matrix
│   │   ├── audit.ts               # Audit log helper
│   │   └── services/              # Tenant-scoped domain services (one per module)
│   └── middleware.ts              # Locale + auth middleware
├── tests/
│   ├── unit/
│   ├── integration/              # incl. mandatory tenant-isolation tests
│   └── e2e/                       # Playwright critical flows
├── docker/
│   └── Dockerfile
├── docker-compose.yml             # app + postgres + minio (dev)
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

## Conventions
- **Services** in `src/server/services/*` are the only place Prisma is queried for business
  data; each function takes a `TenantContext` and scopes by `organizationId`.
- **Server Actions** live beside their route (`actions.ts`) and call services after
  `requireAuth()` + `can()` checks and Zod validation.
- **No business logic in UI components**; components render and dispatch actions.
- **No hardcoded user-facing text**; every string via `useTranslations()` / `getTranslations()`.

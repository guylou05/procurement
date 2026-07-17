# BuildFlow Africa

Mobile-first, bilingual (English/French), multi-tenant **field operations SaaS** for
construction and service SMEs in Africa. It replaces the WhatsApp + paper + Excel
workflow with projects, attendance, daily site reports, materials, expenses, equipment,
tasks, issues, clients and basic invoicing — designed for smartphones and slow networks.

> Working name is **BuildFlow Africa**; branding lives in `src/config/brand.ts` and
> `src/app/globals.css` so name/logo/colors/domain can change without touching features.

## Tech stack

Next.js (App Router) · TypeScript (strict) · Tailwind + shadcn-style UI · Prisma +
PostgreSQL · Auth.js (credentials) · next-intl (en/fr) · S3/R2/MinIO storage adapter ·
Docker · Vitest + Playwright.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full architecture, and the
other docs for the [page map](docs/PAGE_MAP.md), [database model](docs/DATABASE_MODEL.md),
[permission matrix](docs/PERMISSION_MATRIX.md), [roadmap](docs/ROADMAP.md),
[risks](docs/RISKS.md), [localization](docs/LOCALIZATION.md) and [future work](docs/FUTURE.md).

## What is implemented today

This is a **working foundation plus a vertical slice** of the MVP, not a finished product.

**Fully working (DB-backed, tenant-scoped, authorized, bilingual):**
- Authentication (register + credentials login), organization onboarding
- Multi-tenancy: session-derived org context, server-side isolation, RBAC guards, audit log
- Role-aware dashboard with live metrics
- Projects (list, create, detail) + clients
- Daily site reports (list, create draft/submit) + PM review action
- Attendance (fast per-worker capture with audited corrections)
- Workers (list, create, detail with attendance history)
- Materials & inventory (list with low-stock flags, create, stock transactions)
- Expenses (record draft/submit, approval thresholds, approve/reject with audit)
- Tasks (Kanban board grouped by status, create, advance status)
- Issues & incidents (report by category/severity, resolve)
- Clients (list, create; linked from projects and expenses)
- Equipment & assets (list, create, detail, status transitions, maintenance history)
- Invoices & payments (line items, computed totals, record payment with auto status)
- Client portal (shared project progress, milestones, invoices — strict internal-data
  isolation; CLIENT-role users are redirected here and never see the internal app)
- Design system, localized routing, PWA manifest

**Scaffolded (schema + services + navigation present; full UI pending):**
Material requests, reports, team, settings. These render an honest "module in progress"
screen — no fake-operational UI. See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the build order.

**Documented, not built:** marketplace/RFQ, logistics, mobile-money execution, payroll,
AI, biometric attendance, native apps, public API — see [`docs/FUTURE.md`](docs/FUTURE.md).

## Getting started (local)

Prerequisites: Node 22+, Docker (for PostgreSQL + MinIO).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   generate an AUTH_SECRET: openssl rand -base64 32

# 3. Start PostgreSQL + MinIO
docker compose up -d db minio

# 4. Apply the schema and seed demo data
npm run prisma:migrate      # creates the database schema
npm run db:seed             # one bilingual demo org

# 5. Run the app
npm run dev                 # http://localhost:3000
```

Demo login (after seeding): `owner@demo.africa` / `Password123!`

## Full Docker

```bash
docker compose up --build   # app + db + minio
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Prisma generate + production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (unit + integration) |
| `npm run test:e2e` | Playwright critical flows |
| `npm run prisma:migrate` | Create/apply dev migration |
| `npm run db:seed` | Seed demo data |

## Testing

Unit tests cover the permission matrix and money handling. The **mandatory
tenant-isolation test** (`tests/integration/tenant-isolation.test.ts`) proves a user in
one organization cannot read another's records by id; it runs when `TEST_DATABASE_URL`
is set and skips otherwise so CI stays green without a database.

## Security notes

Tenant isolation is enforced server-side only — organization IDs from the client are
never trusted; membership is validated on every request. Every mutation re-checks
permissions after auth. Financial data and worker documents are treated as sensitive and
excluded from the client portal. See `docs/ARCHITECTURE.md` §7 and `docs/RISKS.md`.

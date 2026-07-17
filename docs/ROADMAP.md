# BuildFlow Africa — MVP Roadmap

The spec's phased order is followed. Within Phase 4, modules ship one at a time, each
going through: schema → migration → service → authorization → validation → UI →
translations → tests → seed → mobile responsiveness check.

## Phase 1 — Architecture plan ✅
Architecture, page map, DB model, permission matrix, roadmap, risks, folder structure.

## Phase 2 — Foundation
- [ ] Next.js (App Router) + TypeScript strict + Tailwind + UI primitives
- [ ] Prisma schema (all entities) + Postgres + migration tooling
- [ ] Auth.js (credentials, verification, reset, invites) foundation
- [ ] next-intl with en/fr catalogs + locale routing
- [ ] Multi-tenancy: session org context + scoped service layer + authz helpers
- [ ] Docker + docker-compose (app, Postgres, MinIO)
- [ ] Env config, ESLint, Prettier, Vitest, Playwright

## Phase 3 — Design system
Reusable layout, sidebar + mobile bottom nav, cards, data tables, form controls, status
badges, file/photo uploader, language switcher, currency/date display, empty/loading/error
states.

## Phase 4 — Core modules (MVP scope)
Order chosen so the highest-value field flows land first:

1. Authentication + account/email verification + password reset
2. Organization onboarding
3. Role-aware dashboard
4. Projects (+ clients as dependency)
5. Workers
6. Attendance (fast mobile flow)
7. Daily site reports (+ PDF, approvals)
8. Tasks (Kanban/list/calendar)
9. Expenses (+ approval thresholds)
10. Materials & material requests
11. Equipment & assets
12. Issues & incidents
13. Clients + client portal
14. Notifications
15. Basic reports & exports
16. Settings (org + user) + audit log
17. Super-admin dashboard

## Phase 5 — Quality & deployment
Unit + integration tests, mandatory tenant-isolation tests, Playwright e2e for the 7
critical flows, a11y/perf/security review, Docker production setup, deployment + backup
docs, error-monitoring hooks.

## Explicitly deferred (foundation prepared, not built)
Procurement/logistics marketplaces, RFQ, purchase orders, delivery tracking, mobile-money
payment execution, payroll, WhatsApp/SMS/push channels, AI assistants/summaries/forecasting,
biometric/facial/QR attendance, native apps, public API/webhooks, white-labeling,
subcontractor & government-reporting portals. Each has a hook point noted in code and
`docs/FUTURE.md`.

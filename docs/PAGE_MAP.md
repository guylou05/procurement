# BuildFlow Africa — Page Map

Locale is a route segment: every app route lives under `/[locale]/…` (`en` | `fr`).

## Public / marketing

| Route | Purpose |
|-------|---------|
| `/[locale]` | Landing page |
| `/[locale]/login` | Sign in |
| `/[locale]/register` | Create account |
| `/[locale]/forgot-password` | Request password reset |
| `/[locale]/reset-password` | Set new password (token) |
| `/[locale]/verify-email` | Email verification |
| `/[locale]/invite/[token]` | Accept team invitation |

## Onboarding

| Route | Purpose |
|-------|---------|
| `/[locale]/onboarding` | Create organization (name, country, language, currency, timezone, industry, logo) |

## Authenticated app (org-scoped, `(app)` group)

| Route | Purpose |
|-------|---------|
| `/[locale]/dashboard` | Role-aware dashboard |
| `/[locale]/projects` | Project list (filters: project, date, city, status, PM) |
| `/[locale]/projects/new` | Create project |
| `/[locale]/projects/[id]` | Project detail (overview, team, docs, milestones, tasks, expenses, materials, reports, issues, activity) |
| `/[locale]/projects/[id]/edit` | Edit project |
| `/[locale]/daily-reports` | Daily report list |
| `/[locale]/daily-reports/new` | New daily report (mobile-optimized, <3 min) |
| `/[locale]/daily-reports/[id]` | Daily report detail + PM approve/reject/comment + PDF |
| `/[locale]/tasks` | Tasks (Kanban / list / calendar views) |
| `/[locale]/attendance` | Attendance capture + history (fast mobile flow) |
| `/[locale]/workers` | Worker list |
| `/[locale]/workers/[id]` | Worker detail (docs, certs, attendance, payment history) |
| `/[locale]/materials` | Materials & inventory |
| `/[locale]/materials/requests` | Material requests workflow |
| `/[locale]/expenses` | Expenses + approvals |
| `/[locale]/equipment` | Equipment & assets |
| `/[locale]/equipment/[id]` | Equipment detail (assignments, inspections, maintenance, fuel) |
| `/[locale]/issues` | Issues & incidents |
| `/[locale]/clients` | Clients |
| `/[locale]/clients/[id]` | Client detail |
| `/[locale]/invoices` | Invoices & payments |
| `/[locale]/reports` | Reports & analytics (CSV/Excel/PDF export) |
| `/[locale]/notifications` | Notification center |
| `/[locale]/team` | Team management + invitations |
| `/[locale]/settings` | Organization settings |
| `/[locale]/settings/profile` | User profile & language preference |
| `/[locale]/settings/audit-log` | Audit log viewer |

## Client portal (`(portal)` group, restricted)

| Route | Purpose |
|-------|---------|
| `/[locale]/portal` | Client's shared projects |
| `/[locale]/portal/[projectId]` | Progress, approved photos, milestones, documents, invoices, payments (no internal data) |

## Super-admin (`(admin)` group, platform staff)

| Route | Purpose |
|-------|---------|
| `/[locale]/admin` | Platform dashboard (organizations, subscriptions, activity, errors) |
| `/[locale]/admin/organizations` | Manage / suspend orgs, safe impersonation |

## Main navigation

Desktop sidebar: Dashboard · Projects · Daily Reports · Tasks · Attendance · Workers ·
Materials · Expenses · Equipment · Issues · Clients · Invoices · Reports · Team · Settings.

Mobile bottom nav (speed-first): **Home · Projects · Check In · Report · More**.

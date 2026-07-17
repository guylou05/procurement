# BuildFlow Africa — Database Model Plan

PostgreSQL via Prisma. Every business entity carries `organizationId`, `createdAt`,
`updatedAt`, `createdById` where meaningful, and soft-delete (`deletedAt`) where records
must be recoverable. All `organizationId` columns are indexed; tenant-scoped lookups use
composite indexes.

## Entity groups

### Identity & tenancy
- **User** — global identity (email, hashed password, name, verified, preferred locale).
- **Organization** — tenant root (name, country, currency, timezone, language, industry,
  size, logo, branding overrides).
- **OrganizationMember** — join of User↔Organization with `role` + optional `branchId`.
- **Invitation** — pending invite (email, role, token, expiry, status).
- **Branch** — optional sub-unit of an organization (future multi-branch).
- **UserPreference** — per-user locale, theme, notification prefs.
- **OrganizationSetting** — per-org configuration (approval thresholds, feature flags).

### Billing (models present, not activated in MVP)
- **Plan** — Starter/Growth/Business/Enterprise definitions + limits.
- **Subscription** — org's plan, status, period.
- **UsageLimit** — per-org usage counters vs plan caps.

### Projects
- **Client** — customer record (contacts, WhatsApp, billing address).
- **Project** — core project (code, client, dates, status, priority, budget, currency,
  PM, supervisor, completion %, type, contract value, GPS).
- **ProjectMember** — user↔project assignment with project role.
- **ProjectMilestone** — milestone (name, due date, status, completion).
- **ProjectDocument** — file attachment scoped to a project.

### Workforce
- **Worker** — workforce record (may exist without a User). Rates, employment type,
  status, hire date, emergency contact.
- **WorkerDocument** — ID/other documents.
- **WorkerCertification** — certifications with expiry.
- **AttendanceRecord** — per worker/project/day status (present/absent/late/half/OT),
  check-in/out, GPS, photo, corrections (audited).
- **TimeEntry** — optional granular time tracking derived from attendance.

### Field operations
- **DailyReport** — one per project/day: weather, workers/subs present, work done/planned,
  materials received/used, equipment, delays, incidents, blockers, visitors, notes,
  signature, status (draft→submitted→approved/rejected/changes-requested).
- **DailyReportPhoto** — photos attached to a report.
- **DailyReportComment** — PM/team comments.
- **Task** — work order (title, desc, assignee, priority, status, dates, approval reqd).
- **TaskChecklistItem** — checklist rows.
- **TaskComment** — comments.
- **Issue** — incident/blocker (category, severity, status, assignee, resolution).
- **IssueComment** — comments/activity.

### Materials & procurement (marketplace anticipated, not built)
- **MaterialCategory** — grouping.
- **Material** — item (SKU, unit, supplier, unit cost, quantities, min stock, location).
- **MaterialTransaction** — purchase/receive/issue/use/return/transfer/adjust/damage/loss.
- **MaterialRequest** — request header (status workflow).
- **MaterialRequestItem** — requested lines.

### Finance
- **ExpenseCategory** — grouping.
- **Expense** — field expense (amount, currency, vendor, method, receipt, approval).
- **Invoice** — basic invoice (number, client, project, dates, tax, discount, status).
- **InvoiceItem** — line items.
- **Payment** — recorded payment (method adapter-ready).

### Equipment
- **Equipment** — asset (asset id, category, serial, cost, condition, status, location,
  maintenance schedule).
- **EquipmentAssignment** — check-out/in to project/worker.
- **EquipmentInspection** — inspection records.
- **EquipmentMaintenance** — maintenance history/schedule.
- **EquipmentFuelLog** — fuel usage where applicable.

### Platform cross-cutting
- **Notification** — in-app/email notification (type, payload, read state).
- **FileAttachment** — generic storage reference (key, mime, size, owner entity).
- **AuditLog** — user, org, action, record type/id, before/after, timestamp, IP.
- **ActivityLog** — human-friendly activity feed entries.

## Enums (extensible)

`Role`, `EmploymentType`, `ProjectStatus`, `ProjectPriority`, `TaskStatus`, `IssueStatus`,
`IssueSeverity`, `AttendanceStatus`, `DailyReportStatus`, `ExpenseStatus`, `PaymentMethod`,
`MaterialTxnType`, `MaterialRequestStatus`, `EquipmentStatus`, `InvoiceStatus`,
`NotificationType`, `Currency`, `Country`.

Enums are used where the set is genuinely closed; free-form extensibility (e.g. custom
categories) uses related tables instead of enums so tenants can extend them.

## Integrity rules
- FKs `ON DELETE` favor `RESTRICT`/soft-delete over cascade for financial/audit safety.
- Unique constraints: `Project.code` per org, `Worker.workerId` per org, `Invoice.number`
  per org, `OrganizationMember (userId, organizationId)`, `Invitation.token`.
- Composite indexes on `(organizationId, <frequently-filtered column>)`.

The concrete source of truth is `prisma/schema.prisma`.

# BuildFlow Africa — Future Features & Hook Points

Documented, not built in the MVP. Each has an architectural hook so it can be added
without a rewrite.

| Feature | Hook point |
|---|---|
| WhatsApp / SMS / Push notifications | `Notification` model + `src/server/services/notification` channel adapter (in-app + email today) |
| Mobile money execution (Orange/MTN/Wave/M-Pesa/Airtel) | `Payment` + payment-provider adapter interface |
| Card/online billing (Stripe/Paystack/Flutterwave) | `Plan`/`Subscription`/`UsageLimit` + billing-provider adapter |
| Payroll | Attendance + `Worker` rates already captured; export hooks in reports |
| Procurement marketplace / RFQ / Purchase orders | `MaterialRequest` workflow + supplier fields; separate bounded context later |
| Logistics / delivery tracking | Order/transport entities to be added; project GPS already stored |
| Vehicle GPS tracking | `Equipment` (vehicles) + telemetry ingestion service |
| AI assistant / report summaries / delay & material forecasting | Read-only analytics over existing data; inference service behind feature flag |
| Biometric / facial / QR attendance | `AttendanceRecord` already supports photo + GPS; add capture providers |
| Native Android/iOS apps | Service layer is framework-agnostic; expose via public API |
| Public API + webhooks | Lift `src/server/services/*` behind route handlers / dedicated API |
| White-labeling | Per-org branding overrides in `Organization` + `src/config/brand.ts` |
| Multiple branches | `Branch` entity + `OrganizationMember.branchId` present |
| Subcontractor portal / Government contract reporting | Extend portal group + reporting exports |

Full offline synchronization (beyond draft preservation + upload retry) is deliberately
**not** claimed and is a distinct future workstream.

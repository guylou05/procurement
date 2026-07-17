# BuildFlow Africa — Permission Matrix

Roles are coarse defaults; permissions are granular so **custom roles** can be introduced
later without schema changes. The authoritative mapping lives in
`src/server/permissions.ts`; this document mirrors it for humans.

Legend: ✅ full · 🟡 own/assigned scope only · — none.

| Permission | Super Admin | Owner | Admin | Project Mgr | Supervisor | Worker | Accountant | Client |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Manage all organizations | ✅ | — | — | — | — | — | — | — |
| Impersonate accounts | ✅ | — | — | — | — | — | — | — |
| View platform activity/errors | ✅ | — | — | — | — | — | — | — |
| Manage organization settings | — | ✅ | 🟡 | — | — | — | — | — |
| Manage billing/subscription | — | ✅ | — | — | — | — | — | — |
| Invite / manage users | — | ✅ | ✅ | — | — | — | — | — |
| Manage roles/permissions | — | ✅ | 🟡 | — | — | — | — | — |
| Create/edit projects | — | ✅ | ✅ | 🟡 | — | — | — | — |
| View all projects | — | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Assign supervisors | — | ✅ | ✅ | ✅ | — | — | — | — |
| Manage workers | — | ✅ | ✅ | 🟡 | — | — | — | — |
| Record attendance | — | ✅ | ✅ | ✅ | ✅ | 🟡 | — | — |
| Correct attendance (audited) | — | ✅ | ✅ | ✅ | 🟡 | — | — | — |
| Submit daily report | — | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Approve/reject daily report | — | ✅ | ✅ | ✅ | — | — | — | — |
| Create/assign tasks | — | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Complete assigned task | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Manage materials/inventory | — | ✅ | ✅ | 🟡 | 🟡 | — | — | — |
| Submit material request | — | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Approve material request | — | ✅ | ✅ | ✅ | — | — | — | — |
| Record expense | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |
| Approve expense | — | ✅ | ✅ | ✅ | — | — | 🟡 | — |
| Manage equipment/assets | — | ✅ | ✅ | 🟡 | 🟡 | — | — | — |
| Report issue | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Resolve/assign issue | — | ✅ | ✅ | ✅ | 🟡 | — | — | — |
| Manage clients | — | ✅ | ✅ | 🟡 | — | — | — | — |
| Manage invoices/payments | — | ✅ | ✅ | — | — | — | ✅ | — |
| View financials/budgets | — | ✅ | ✅ | 🟡 | — | — | ✅ | — |
| Export reports | — | ✅ | ✅ | 🟡 | — | — | ✅ | — |
| View audit log | — | ✅ | ✅ | — | — | — | — | — |
| Access client portal (shared only) | — | — | — | — | — | — | — | ✅ |

### Notes

- **Worker accounts are optional.** Many workers exist only as workforce records with no
  login; the `WORKER` role applies only to those given app access.
- Client visibility is deny-by-default: the portal exposes only explicitly shared
  project progress, approved photos, milestones, documents, invoices and payments —
  never payroll, worker rates, margins, internal comments, unapproved expenses or
  internal incidents.
- Every 🟡 is enforced by scoping queries to the user's assigned projects/records in the
  service layer, in addition to the role check.

# BuildFlow Africa — Major Risks & Mitigations

| # | Risk | Impact | Mitigation |
|---|------|--------|-----------|
| 1 | **Cross-tenant data leak** (IDOR, org-switch) | Critical — trust-destroying | All access via scoped service layer; org resolved from session, never client; membership validated on every request; mandatory tenant-isolation tests in CI. |
| 2 | **Unreliable connectivity** loses field data | High — foremen abandon app | PWA app-shell caching; local draft preservation for priority forms; upload retry; skeletons + offline indicator. No false "full offline sync" claim. |
| 3 | **Low technical literacy** of field users | High — poor adoption | Speed-first mobile UX, large touch targets, minimal steps, bottom nav, daily report <3 min, helpful empty states, plain-language French. |
| 4 | **Localization debt** (hardcoded strings) | Medium — blocks FR market | Enforce translation keys; lint rule / review against literal JSX text; complete en+fr catalogs; natural business French. |
| 5 | **Currency/country assumptions** | Medium — wrong totals/formats | Per-org (optional per-project) currency; locale-aware Intl formatting; no hardcoded tax/date/phone formats. |
| 6 | **Scope creep** into Procore-clone / marketplace / AI | High — never ships | Strict MVP module list; future features documented with hook points only; "no fake functionality" rule. |
| 7 | **File-upload abuse / large photos** | Medium — cost + security | Type + size validation, signed URLs, client-side compression, storage adapter with quotas. |
| 8 | **Weak authorization** in a hurry | High — privilege escalation | Central `can()` checks; server re-validates every mutation; permission matrix as living doc + tests. |
| 9 | **Hosting lock-in** | Medium — migration pain | Docker-first; storage/billing/payment behind adapters; managed-Postgres-agnostic. |
| 10 | **Money handling correctness** | High — disputes | Store amounts as integer minor units + currency; no floats; keep MVP accounting deliberately simple. |
| 11 | **Audit gaps** on sensitive edits | Medium — compliance/disputes | `AuditLog` on attendance corrections, approvals, permission changes, financial edits. |
| 12 | **PDF/report generation performance** | Low/Medium | Generate on demand, cache where safe, offload heavy exports to background jobs later. |

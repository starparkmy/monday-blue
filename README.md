# Starpark Returns Desk

A responsive, installable browser app for the Phase 1 returns pilot. No Google Play or Apple App Store listing is needed. Desktop and phone users share the hosted Cloudflare D1 database and protected R2 evidence storage through Sites.

## First use

1. Open the one-time administrator setup link supplied with delivery. Choose your own email and a password of at least 12 characters. The setup token travels in a URL fragment, is removed from browser history on load, and is accepted only before the first user exists.
2. Open Team & settings. Add named staff, their roles and approval limits. Share initial passwords separately using your existing secure channel; no email is sent by the app. Staff change their password from the profile button.
3. Configure warehouse locations and internal follow-up targets. Approvals above the configured separation threshold must come from another account.
4. Pilot a small set of returns before moving operational records from Trello.

## Implemented workflow

- Unique RMAs, manual original-order verification, multiple items/components and cartons, assigned CS owner, dispatch tracking and exception states.
- Lookup by RMA, order, SKU, customer, tracking or courier; combined channel, status, team and age filters.
- Mobile receiving with cumulative quantities and independent item inspection; packaging, condition and completeness checklists; A–E grades; stock location and proposed disposition.
- Camera/USB/manual barcode lookup. Camera scanning depends on browser BarcodeDetector support; the manual path is always available. Printable Code 39 internal labels.
- Compressed camera/photo upload linked to item and receipt, with actor/time. No evidence deletion endpoint. Submitted inspections lock until CS requests clarification.
- CS handoff and in-app task/overdue views. Manual remedies, configurable approval limits, server-side roles and separation of duties.
- Pending, successful and failed refund records; investigated retries; provider reference capture. A refund is never sent to a marketplace by this app.
- Atomic order-level balance guard, including refunds recorded before RMS, pending reservations, successful refunds and multiple RMAs on the same order. Optimistic versions reject stale case writes. Unique resolution IDs prevent duplicated refund task insertion.
- Inventory confirmation with ERP reference. Closure requires completed stock handling and a confirmed financial or fulfilled nonfinancial remedy.
- CSV export, basic channel/reason/backlog reporting and append-only operational audit entries.

## Authentication and access

The login page is public as authorised; every record, evidence and operational API requires an active staff session. Passwords use individually salted PBKDF2 SHA-256 hashes, sessions use random tokens stored hashed, and cookies are HttpOnly, SameSite=Strict and Secure on HTTPS. Writes require same-origin JSON requests. Login attempts are rate-limited by email and client IP. Role checks execute on the server. Deactivation and password reset revoke sessions. Warehouse payloads omit customer and financial fields.

**Pilot limitations before wider production adoption:** privileged-account MFA and recovery codes are not yet implemented. Agree your retention/deletion policy, encrypted backup/export and restore process, incident monitoring, account recovery procedure and data-processing arrangements before loading sensitive operational records at scale. These are not certified UK GDPR controls. The hosting provider manages infrastructure; this repository does not configure or verify scheduled backups or restore tests.

## Scope still remaining from the full requirements

- Shopify, eDesk, Orderwise, marketplaces, courier and accounting integrations; Trello import and reconciliation. Nothing is connected automatically. Verify API entitlements separately.
- Conflict-safe offline capture/synchronisation (current version requires a connection and never caches private records in the service worker).
- Automatic customer communications, emailed alerts and password-recovery email delivery.
- Per-component mixed financial remedies within a single RMA, original-order-line quantity reconciliation across RMAs, product catalogue images, granular parcel-to-component allocations and refund reversals. Use separately reviewed RMAs for different remedies in this pilot and verify eligibility manually in the source sales channel.
- Sale rates, realised stock recovery value, supplier defect trends, advanced SLA calendars (current business days exclude weekends, not bank holidays).
- Financial delivery/collection/adjustment lines are recorded in the resolution rationale and total, not separate accounting fields. No automatic deductions.
- List/report/CSV views are bounded to the latest 1,000 cases; the admin audit view to the latest 500 events. Add pagination before higher-volume use.

## Local development

Node >=22.13.0. From this directory run `npm run install:ci` if dependencies are missing, then `npm run db:generate` only after schema changes. Set a local SETUP_TOKEN in ignored `.dev.vars`. Build using `npm run build`, apply each new SQL migration once with the bundled Wrangler D1 local command, then `npm run dev`. The development URL is http://127.0.0.1:5173. Local preview data is separate from production.

`node scripts/test-workflow.mjs` runs the workflow/security integration checks against an isolated SQLite database with the same migrations and SQL as D1. `node node_modules/typescript/bin/tsc --noEmit` checks types. The Sites build helper builds the production Worker and client assets.

## Storage design

Relational tables: users, sessions, orders, cases, refunds, photos, audit, settings and attempts. Item/parcel/inspection snapshots are stored in each versioned case JSON aggregate; photo and refund foreign keys link evidence and transactions. Atomic D1 batches update case state and the audit together; refund reservation is guarded in SQL. Photos live in R2 and are served only through authenticated routes. Service-worker navigation is network-only.

## Cost and rollout

A PWA removes app-store distribution fees. Hosting, storage and third-party integrations still have provider-specific limits and possible charges; no paid plan or domain was purchased. Review your hosting entitlement and expected photo volume before scaling. The default Sites domain avoids buying a custom domain.

## Verification performed

The integration suite covers unauthenticated access, invalid/duplicate setup, RBAC, CSRF, multi-item receiving, required photos, submitted-inspection locking, stale versions, approval limits, separation of duties, failed-refund retry, duplicate initiation/confirmation, order balance across RMAs and stock-gated closure. The local running browser was checked for staff login, queue loading, parcel receipt persistence and a 390px mobile inspection layout. Camera hardware and actual marketplace/ERP operations were not tested.

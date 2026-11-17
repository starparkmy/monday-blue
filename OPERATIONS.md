# Mobile photo board — November 2026 rebuild

The home page now opens the new mobile-first photo board. The previous application and its records remain at `/legacy`. Existing staff accounts are reused; board cards are stored separately from old workflow cases. Nothing is migrated or deleted automatically.

## First workflow
1. Sign in, tap **New return**, then **Take photo** or **Choose photos**.
2. Tap **Save return**. Only a photo is required. The server assigns a dated unique reference using UK midnight; counters are shared with the previous workspace so references cannot collide.
3. Open the saved card to add a title, description, labels, more photos and comments. Received-date lists follow the Trello reference.

Staff with Warehouse, Inventory, Customer service or Administrator roles can create and edit. Other staff can view. Photos are served only after login and are never publicly cached. Saves require a connection; unsaved photos remain only in the current page. Retry preserves the same request ID; concurrent edits are rejected instead of overwriting another staff member. Up to 8 photos per upload and 40 per card. JPEG, PNG and WebP accepted. Photos larger than 4 MB are resized to a maximum 2048 pixels and JPEG quality 85% with a visible notice. Smaller files are retained unchanged. Browser camera/file capture does not use the barcode scanner.

The first board is for record keeping: labels do not execute refunds or stock changes. Description and comments are manual; OCR is not required. Search filters loaded cards (50 per page; load more for older cards). Photo removal after saving, offline saving and automatic Trello migration are outside this first version. The previous workflow's backup/export UI does not yet provide a complete photo-board export; preserve both the D1 settings data and R2 storage together for this version.

Development verification uses a separate local database and synthetic images. Keep `.wrangler`, local logs, test credentials and customer photos out of Git. The new authenticated app is not deployed by the GitHub Pages preview.

---

# monday blue operations

## Changes in this release

- Unidentified receiving accepts blank SKU/description and stores parcel or return-level photos before item identification. Each item must be identified before inspection submission. CS can enter verified item payment amounts before proposing remedies.
- Detailed usage condition, packaging, completeness, damage types and missing accessories. Inspection drafts save to the server with version checks.
- One remedy per item, separately tracked fulfilment, calculated item/delivery/collection/adjustment totals, and credit-note references separate from provider references. Existing case-level resolutions remain readable and retain their original workflow.
- Server-side search and 100-row pagination. The All returns screen has combined filters. Reports and overview totals are calculated with database aggregates. Operational queues load 100 records at a time. CSV exports stream matching records in 100-row chunks.
- Live task inbox, refreshed every minute, with different inspection and decision targets. Tasks are derived from authoritative case state and disappear when complete. No email is sent. Business days exclude weekends; public holidays are not configured.
- Authenticator MFA with one-time recovery codes, password recovery, administrator reopening/correction reasons and audit history. No external payment or ERP action is triggered.

## Receiving workflow

New CS cases receive an immutable RMA authorisation reference. Their daily R01N-style number is assigned on first warehouse receipt using the Europe/London date, resetting at UK midnight. The displayed full reference includes the date so different days remain distinct. Later parcels retain the first receipt reference; existing numbered cases keep their references.

Tracking comparisons ignore spaces, hyphens and letter case. A previously received tracking number opens the existing return instead of creating another receipt. New receipts reserve tracking atomically; older parcel records are also checked.

Before inspection submission, use **Split unidentified item** to replace an unknown placeholder with two or more identified SKU lines and actual quantities. Select the received parcel and give a reason. The original item remains in history; CS must verify quantities and payment amounts. Items with recorded payment amounts cannot be split by this action.

Use **Link existing photo** to associate an uploaded image with an identified item and parcel. One image can support multiple items. Links are additive and audited; the original upload and attachment remain intact. Splitting and linking lock after inspection submission or a remedy proposal.

## Items 5–8: quantities, photos, reports and Trello

### Verify eligible units

In **Decision & refund → Eligible return quantities**, CS verifies the purchased quantity per SKU and records the sales-document reference. Earlier returns means units returned before monday blue, not other cases already in this database. SKU matching ignores letter case and surrounding spaces. Additional missing SKUs can be verified later; existing verified quantities cannot be overwritten through this form.

Select **Reserve / recheck eligible units** before proposing a remedy. The reservation uses the larger of expected and received quantities. Reservations across cases, earlier approved/proposed remedies and pre-system returns consume the same purchased allowance. The database checks allocations atomically to prevent two staff allocating the final units. Physical excess receipts can still be recorded but cannot proceed to a remedy/refund without sufficient eligibility. Changing SKU or quantities requires a recheck. Release an unused duplicate reservation with a reason before another case can use it. Existing approved cases need verified quantities and a reservation before creating a new refund task; confirmed refunds are preserved.

This relies on staff-verified sales information, not an automatic Shopify/ERP connection. Incorrect existing purchase baselines require an audited operator review; do not bypass them by creating a differently spelled order or channel. Each order must retain the same channel/order reference.

### Photo batches and viewing

Choose up to 20 photos or use the separate camera input. Photos are compressed individually, uploaded sequentially and show per-file progress. Failed files can be retried without resending saved files. Stable upload request IDs protect retries when the server saved a file but the response was lost. Retry first refreshes the case version. Keep the upload dialog open; unsent files are not persisted after closing or refreshing. Tap evidence to rotate its view or zoom up to 400%; stored originals remain unchanged.

### Scalable reporting and exports

Reports calculate full-database totals, inspected units, successful refund-ledger amounts and grouped counts on the server, with UK receipt/record date and channel filters. Groups show the top 100 categories, while totals include every matching case. Warehouse users do not receive monetary totals. CSV downloads stream matching records in batches rather than loading every return into React state. Reports are live queries, not a transactionally frozen accounting snapshot.

The operational queue loads 100 matching records per page; filters run across the database. **All returns** searches the entire database. **Export matching CSV** includes all records matching the search/status/channel/team/work-queue filters; business-day age filtering also restricts CSV. Use report date filters or All returns for precise date searches.

### Controlled Trello import

Administrators open **Trello import**, choose a board JSON export (maximum 5 MB and 200 cards per preview), map list names to confirmed YYYY-MM-DD UK receipt dates, then preview. Ambiguous dates block those cards. Review each card's source description, available comments, labels and attachment references. Select up to 25 cards and type the selected count to commit one atomic batch. Re-preview after each batch: source count equals ready + blocked + already imported. Changed previews and previously imported card IDs are rejected.

Each imported card becomes an unmatched **Imported — Needs review** record. Card titles remain legacy references; historical receipt dates are retained separately. No new daily R-number, successful refund or stock movement is inferred. Verify order, actual SKUs, quantities and historical payment/stock reconciliation before normal processing. Raw source descriptions and comments are hidden from Warehouse accounts.

**Attachment references are retained; image binaries are not downloaded or copied.** Unsafe/non-Trello URLs are omitted. The JSON may not contain every historical comment; only comments present in the export can be retained. Use the normal evidence uploader for retrieved image files. No live Trello board is changed, and no real records are imported automatically by installing this release.

Trello export guidance: https://support.atlassian.com/trello/docs/exporting-data-from-trello/ and https://support.atlassian.com/trello/docs/making-sense-of-trellos-json-export/

## MFA rollout

1. Open Account security in the full local app. Enter your current password to start setup.
2. Add the displayed setup key to an authenticator as a time-based SHA-1 code, six digits, 30 seconds. Confirm the current code.
3. Save the eight recovery codes outside the app. They are shown once. Enrolment revokes existing sessions; sign in again. Authenticator codes cannot be replayed.
4. After the administrator enrols, enable Require MFA for Administrator, Inventory and Finance under Team & settings. Unenrolled privileged staff can access Account security but cannot access operational APIs until enrolled.
5. The sign-in page accepts an authenticator code or an unused recovery code. Account recovery requires an unused recovery code and a new password, revokes sessions, and leaves MFA enabled. A subsequent login needs another unused code or the authenticator.
6. Staff without recovery codes must contact an administrator for password reset. Password reset does not bypass MFA. If all privileged users lose both authenticator and recovery codes, an operator-led, identity-verified recovery process is required; there is no public backdoor endpoint.

MFA policy is NOT switched on automatically for existing users, to avoid locking staff out before enrolment. Use a trusted HTTPS deployment before sending credentials over the internet; this change does not deploy hosting.

## Encrypted LOCAL backup and restore verification

The script backs up the local `.wrangler/state` tree (D1 databases and R2 object state), not a remote Cloudflare account. It excludes source and `.dev.vars`; store any deployment credentials separately. Limit: 512 MB of uncompressed local state. Use managed backup tooling for larger stores.

1. Stop monday blue and all Wrangler/Worker processes using that state. The script checks the known Vinext process lock and also requires explicit `--server-stopped`; it cannot detect every external writer.
2. In PowerShell, enter a unique passphrase without putting it in history:

```powershell
$backupSecret = Read-Host 'Backup passphrase (16+ characters)' -AsSecureString
$env:MONDAY_BACKUP_PASSPHRASE = [System.Net.NetworkCredential]::new('', $backupSecret).Password
node scripts/backup-local.mjs backup .wrangler/state C:/Backups/monday-blue-2026-11-16.mblue --server-stopped
node scripts/backup-local.mjs restore-check C:/Backups/monday-blue-2026-11-16.mblue C:/Backups/restore-check-2026-11-16
Remove-Item Env:MONDAY_BACKUP_PASSPHRASE
```

Create the backup parent folder first. Use a new filename and a new restore folder each time. The script refuses to overwrite either an existing backup or restore destination. It uses scrypt + AES-256-GCM, per-file SHA-256 checksums and SQLite integrity/foreign-key checks. Wrong passwords, ciphertext tampering and unsafe paths are rejected. Restore-check never replaces live state.

3. Test the restored copy with a separate local app instance, checking representative return details and evidence links before considering a production replacement. Keep the live state stopped during any operator-led replacement. Retain the previous state for rollback.
4. Keep encrypted backups on a different device, keep the passphrase separately, and take a backup after each working day until automated hosting backups are configured.

No real backup passphrase has been generated, no real data was exported, and no unattended/cloud backup schedule is enabled by this release. Synthetic encrypted backup + restore tests are included in `scripts/test-backup.mjs`.

## Corrections

Administrators can reopen a closed case from Activity with a reason. IDs, confirmed payments and stock movements are retained. An inspection correction is allowed only before a pending/approved remedy and before stock completion; it records the previous/new item and sends inspection back for review. Use audit notes and a separately approved real-world reversal process for already-completed financial/stock transactions.

## Validation

```powershell
node scripts/test-workflow.mjs
node scripts/test-receiving.mjs
node scripts/test-pilot.mjs
node scripts/test-operations.mjs
node scripts/test-backup.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
```

Tests cover existing approval/financial controls plus unidentified evidence, drafts, mixed remedies, credit notes, pagination beyond 1,000 cases, task generation, a published RFC 6238 vector, MFA reuse/recovery, and encrypted backup restoration. Device-camera access and user authenticator enrolment must still be checked on staff devices.

## Deployment boundary

GitHub Pages remains a synthetic scanner preview. These workflow improvements belong to the full app. They do not add hosted database/photo services or replace the separate hosting work.

## Queue filters and purchase corrections

Receiving, CS review, Finance and Stock disposition now filter in the database before pagination. Search, status, channel, team and business-day age filters apply to every record; CSV uses the same criteria. Changing a filter resets to page one.

Administrators can expand **Correct verified purchase quantities** under Decision & refund. A sales reference and reason are required. Each correction stores before/after values in audit history. Concurrent edits are rejected. The atomic update refuses quantities that leave insufficient allowance for existing reservations or approved/proposed remedies; allocations and financial records are never rewritten.

## Phone acceptance test (pending physical device verification)

Use a synthetic test return and test photos. On iPhone Safari and Android Chrome:
1. Open the full app, sign in and check navigation at portrait width. Search a known return using queue filters and verify the same result in CSV.
2. Receive a parcel, select multiple photos, then take an additional camera photo. Confirm progress and that all saved images appear once.
3. Interrupt Wi-Fi during an upload, reconnect and retry. Confirm saved files are not duplicated and failed files recover. Keep the dialog open.
4. Open an image, rotate and zoom, then reopen it to verify stored evidence is unchanged.
5. On HTTPS, allow camera access and scan a physical barcode. On local HTTP, use the barcode-photo fallback.
6. As administrator, attempt an invalid purchase reduction (must be blocked), then a valid correction with a reason and inspect Activity.

Automated API tests do not verify camera permission, actual phone uploads or visual layout. Browser access was unavailable during this update, so these device checks remain pending.

## Parcel barcodes, old stickers and collection notes

Open **Receiving → Open camera**. Live barcode reading requires HTTPS; selecting/taking a photo works on the local Wi-Fi address. Choose **Read barcode** for courier/product labels or **Read printed text** for an old R-number sticker or collection note. Drag across the photo to crop out background, and rotate sideways/upside-down text before OCR. Barcode photos try four orientations. OCR shows confidence and editable text; suggestions are unverified.

Choose or type a confirmed code and, for an old R01N-style sticker, confirm its UK receipt date. Search includes parcel tracking, collection references, SKU and optional product barcode/EAN, as well as return/order references. Spaces and hyphens are ignored. Results always require staff selection; a shared SKU or repeated daily code must never silently select a customer. Product EANs must first be verified against an item's SKU under Identify / update item details.

Choose the code type, then **Review & save received return**. Check the tracking/order reference, customer, actual items and quantities, cartons and receiving location. **Save received return + photos** uploads the full original scan and any additional evidence (1–8 JPEG/PNG/WebP images, up to 4 MB each), then saves the received record, parcel, photo links and audit entry together. OCR crops do not replace the original. Live barcode capture retains the camera frame. The app assigns a unique dated R-number using the UK business date and opens the saved return.

Receipts remain unidentified/unmatched until customer service verifies order and payment details; no refund or restock is triggered. Blank SKUs remain unknown. Duplicate tracking opens the existing record instead of creating another. Retrying the same save cannot create another receipt or duplicate its photos. Failed uploads do not create a visible return; staged uploads from abandoned saves remain private and are not yet automatically cleaned up. Evidence is initially linked to the received parcel; link appropriate photos to items before submitting inspection. Saving requires a server connection. Printed-text recognition assists entry; staff must check fields and quantities manually.

OCR runs in a browser worker with locally served English model assets. Photos are not sent to an OCR provider. The first OCR load is substantial; internet is not needed for third-party assets once the app server supplies them. `scripts/prepare-ocr.mjs` copies installed model/worker assets into public/ocr before dev/build. Run npm install after updating dependencies. Generated OCR assets are excluded from Git and generated during build.

Real supplied screenshot checks: cropped R32N text was recognised, and a product Code 128 barcode decoded. Small/blurred collection-note text and several courier screenshots were not reliable. Use original close-up photos rather than Trello screenshots; review every extracted value. Actual phone camera and browser interaction testing remains pending browser access. These changes are for the full app, not the standalone GitHub Pages preview.

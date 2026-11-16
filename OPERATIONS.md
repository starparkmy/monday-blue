# monday blue operations

## Changes in this release

- Unidentified receiving accepts blank SKU/description and stores parcel or return-level photos before item identification. Each item must be identified before inspection submission. CS can enter verified item payment amounts before proposing remedies.
- Detailed usage condition, packaging, completeness, damage types and missing accessories. Inspection drafts save to the server with version checks.
- One remedy per item, separately tracked fulfilment, calculated item/delivery/collection/adjustment totals, and credit-note references separate from provider references. Existing case-level resolutions remain readable and retain their original workflow.
- Server-side search and 100-row pagination. The All returns screen has combined filters. Existing dashboard and CSV load all pages; very large installations should use server-side aggregate reports next.
- Live task inbox, refreshed every minute, with different inspection and decision targets. Tasks are derived from authoritative case state and disappear when complete. No email is sent. Business days exclude weekends; public holidays are not configured.
- Authenticator MFA with one-time recovery codes, password recovery, administrator reopening/correction reasons and audit history. No external payment or ERP action is triggered.

## Receiving workflow

New CS cases receive an immutable RMA authorisation reference. Their daily R01N-style number is assigned on first warehouse receipt using the Europe/London date, resetting at UK midnight. The displayed full reference includes the date so different days remain distinct. Later parcels retain the first receipt reference; existing numbered cases keep their references.

Tracking comparisons ignore spaces, hyphens and letter case. A previously received tracking number opens the existing return instead of creating another receipt. New receipts reserve tracking atomically; older parcel records are also checked.

Before inspection submission, use **Split unidentified item** to replace an unknown placeholder with two or more identified SKU lines and actual quantities. Select the received parcel and give a reason. The original item remains in history; CS must verify quantities and payment amounts. Items with recorded payment amounts cannot be split by this action.

Use **Link existing photo** to associate an uploaded image with an identified item and parcel. One image can support multiple items. Links are additive and audited; the original upload and attachment remain intact. Splitting and linking lock after inspection submission or a remedy proposal.

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
node scripts/test-backup.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
```

Tests cover existing approval/financial controls plus unidentified evidence, drafts, mixed remedies, credit notes, pagination beyond 1,000 cases, task generation, a published RFC 6238 vector, MFA reuse/recovery, and encrypted backup restoration. Device-camera access and user authenticator enrolment must still be checked on staff devices.

## Deployment boundary

GitHub Pages remains a synthetic scanner preview. These workflow improvements belong to the full app. They do not add hosted database/photo services or replace the separate hosting work.

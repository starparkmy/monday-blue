# monday blue

Light-blue returns management web app with email/password staff accounts, multi-item returns, daily UK return numbering, inspection evidence, refund tracking and stock confirmation.

## GitHub Pages preview

https://starparkmy.github.io/monday-blue/

The public Pages site is a standalone HTTPS barcode scanner preview with one fictional record. It does not provide staff login, access real returns or store images. Camera and photo decoding run locally in the browser. GitHub Pages cannot run the full backend.

## Full app locally

Use Node.js 22.13 or later, run `npm ci`, then `npm run dev`. The backend needs Cloudflare D1 and R2 bindings. Provide your own SETUP_TOKEN in an untracked `.dev.vars` file for initial setup. Never commit credentials or the local database. See `lib/rms.ts` for the server-side workflow and `db/schema.ts` / `drizzle` for database definitions.

New records use a date-qualified reference such as 20261115-R01N. Daily numbering follows Europe/London. Each number identifies one return record; N is a fixed suffix. Back to stock means physically restocked.

## Validation

`node scripts/test-workflow.mjs`

`npx tsc --noEmit --incremental false`

## Rebuild the Pages preview

`npm ci`

`npm run build:pages`

Commit the generated `docs` directory. GitHub Pages publishes main /docs. The complete application still requires a separate backend deployment. This repository does not include operational records, local environment files, photos, browser captures or previous repository history.

## Workflow improvements

See [OPERATIONS.md](OPERATIONS.md) for unidentified receiving, structured inspection, item remedies, refund breakdowns, task deadlines, paginated search, MFA enrolment, recovery and encrypted local backup/restore procedures. MFA enforcement and actual backup scheduling require operator setup.

# Handoff (dashboard redesign, after Step 7a)

Read first: `CLAUDE.md`, `lib/dashboard/ENDPOINTS.md`, and the build tracker (Claude Doc: https://claude.ai/code/artifact/58c9f2e8-2134-4766-8660-0288182c7c0b). This file only holds what those don't.

## Working agreement (per step, from the user)
- Frontend only. Every read and write goes through `lib/dashboard/*.ts` (mock). The user writes the real backend.
- No Prisma schema changes (new fields are marked `// NEW FIELD` / `// NEW MODEL` in `types.ts` and listed in ENDPOINTS.md). No new npm dependencies: if one seems needed, stop and say so in the report.
- Never commit. The user commits.
- Browser testing only for the flows the step lists. The report must list what wasn't checked.
- Each step ends with a 7-part report: built, replaced/deleted (with evidence), deviations, verification + not checked, numbered decisions with recommendations, gaps, tracker/CLAUDE.md updates.
- i18n: en + natural pt-BR. "Leads" is always "Interessados" in pt-BR.

## Intentional (looks wrong, isn't)
- `store.registration` is null until Kennel profile saves: both Verification and Kennel profile then read the real `Kennel.cnpj` / `cbkcRegistration` (`readRegistration`). The Kennel profile masks the CNPJ; Verification still shows a CNPJ in full (Step 6a rule).
- `?state=none|pending|rejected|approved` and `?registration=cnpj|cpf|none` on `/dashboard/settings/verification`: a dev-only aid. It writes the mock store and is ignored by production builds (`lib/dashboard/verification.ts`, marked DEV-ONLY). Delete it along with the mock.
- Account deletion never deletes; the password change never changes anything. Both show a "Preview only" notice (`lib/dashboard/account.ts`).
- Review invites can't send email: `emailSent` is always false and the UI shows the link to copy. `/{locale}/review/{token}` doesn't exist yet (a public-site/backend task).
- `getCurrentKennel()` is real but applies the mock `accountOverrides` name (temporary; `lib/dashboard/kennel.ts`).
- `getAccount` / `updateAccount` read real `Owner` rows through Prisma (duplicate-email check) but write only to the mock store.
- The Account language select shows the locale on screen, not the saved `Owner.locale`.
- Messages: the default (first) conversation on desktop is shown but not marked read; only `?conversation=` marks read.
- The Reviews "Report this review" link also shows on replied reviews (the design only had it beside Reply).
- Overview: the setup checklist hides itself when every step is done (e.g. verification PENDING).

## Half-finished / TODO
- Dog-Edit's "View public page" link 404s for every mock dog (`/kennel/lobos-do-sul/dog/marley`): mock dogs aren't in the database the public route reads. Same class of gap as the slug below; it resolves when Dogs reads Prisma.
- The Cloudinary upload widget's hidden iframe takes one Tab stop on pages with an `ImageUploader` (third-party; not fixable without changing the widget).
- `next dev` logs a harmless React performance-track error ("'UnknownDashboardPage' cannot have a negative time stamp") on the dashboard catch-all 404. Dev only.
- 15 dashboard `<img>` lint warnings stay: converting to `next/image` needs `images.remotePatterns` for Cloudinary, place.dog and YouTube/Vimeo thumbnails (a config decision).
- 4 `public.kennel.*.headingBreed` messages look unused (public site, not touched in 7a).
- Kennel profile edits only the mock: a changed slug makes "Open page" and the sidebar's "View public page" 404 until the backend writes it (the public route reads Prisma). Restarting the server undoes it.
- Kennel profile breeds (real: Husky, Malamute, Samoyed for the demo) are NOT synced to the mock `kennelBreeds` (Labrador, Poodle) that Dogs, Litters, Leads and Media use, on purpose: syncing would make every mock dog's breed invalid. The breed-removal warning counts real `Dog`/`Litter` rows.
- Verification documents are stored as URLs only, so after a submit the names come from the URL (`components/dashboard/settings/documentName.ts`).
- The Cloudinary widget mounts one iframe per `ImageUploader` instance (Media has two).
- Video thumbnails are placeholders (`Media.thumbnailUrl` is null). Message threads aren't paginated.
- Public site: the static review placeholders and TODOs in `app/[locale]/kennel/[slug]/page.tsx`, `components/SiteHeader.tsx`, `components/KennelFilterBar.tsx`.
- Sign out in the sidebar is still a placeholder.
- Test artifact: one 300×300 PNG uploaded to Cloudinary (cloud `e6z7pdzx`, preset `kennel_app_preset`) during Step 5.

## Mock store
- `lib/dashboard/mock/store.ts`, `STORE_VERSION = 9`. Bump it whenever the fixture shape changes, or a running dev server keeps the old shape.
- The store lives in server memory: restarting the server resets all data. Successive test runs against one server see each other's changes.
- Demo login: `ana.kowalski@demo.kennelos.test` / `Demo1234!` (kennel "Lobos do Sul"). Seed: `scripts/seed-demo-batch-2.ts`. Never run `prisma/seed.ts` (it starts with `deleteMany`).

## Commands
- `node scripts/check-messages.mjs`: translation parity, untranslated and unused keys (see CLAUDE.md).
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Browser testing: `npm run build && npx next start -p 3100`, Playwright (`playwright-core` with the installed Chrome; it isn't a project dependency, install it in a scratch folder), log in with `POST /api/auth/login` (JSON email/password). Dev-only features need `next dev`. Only one `next dev` may run per project folder ("Another next dev server is already running"), so use the user's if it's up.
- `tsc` can report errors in `.next/dev/types/validator.ts` after adding a layout while a dev server is running: these are stale generated types and clear after a build.
- Lint: 25 warnings, 0 errors, all known. 22 are `@next/next/no-img-element` (Cloudinary URLs rendered with `<img>` on purpose). 3 are `no-unused-vars` in the legacy `app/api/dogs/route.ts` and `app/api/dogs/[id]/route.ts` (no longer called by the dashboard).

## Next
- Step 7b (open).

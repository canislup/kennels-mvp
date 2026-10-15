# KennelOS dashboard: backend build plan

The whole dashboard runs on a typed mock data layer in `lib/dashboard/`. This plan replaces it with real Prisma code, one function at a time, in an order where the app keeps working after every phase.

- **Contract per function** (inputs, outputs, rules): [`lib/dashboard/ENDPOINTS.md`](../lib/dashboard/ENDPOINTS.md). This plan points to it rather than repeating it.
- **Draft schema** for everything below: [`docs/schema-additions.prisma`](./schema-additions.prisma) (validated against the real schema; not used by the app).
- Everything said here about the existing schema, auth and API routes was read from the code and the database on 2026-10-13. Where something couldn't be confirmed, the text says so.

Contents: [1. How to swap mock for real](#1-how-to-swap-mock-for-real) · [2. Schema changes](#2-schema-changes) · [3. Cross-cutting rules](#3-cross-cutting-rules) · [4. Build order](#4-build-order) · [5. Function index](#5-function-index) · [6. Security checklist](#6-security-checklist) · [7. Open product decisions](#7-open-product-decisions) · [8. Seeding](#8-seeding)

---

## 1. How to swap mock for real

### The contract

Every exported function in `lib/dashboard/*.ts` keeps its **name, parameters and return type**. Only the body changes. Pages, components and Server Actions never import `mock/`, so they keep working untouched.

| Must not change | Why |
| --- | --- |
| `lib/dashboard/types.ts` | The UI is typed against it. If a shape must change, change it there and fix the compile errors. |
| `lib/dashboard/validation/*` | It's real code already, used by the Server Actions. Keep calling it. |
| Translation keys (`dashboard.common.errors.*` etc.) | Functions return error **keys**, the UI translates them. Map database errors to the existing keys (section 3, Errors). |
| Return values are plain data | Dates go out as ISO strings (`toISOString()`), date-only values as `"YYYY-MM-DD"`. Never return `Date` objects or Prisma `Decimal`s. |

Each file starts with `// MOCK IMPLEMENTATION` (still mock), `// REAL LOGIC` (keep as is) or says it's partly real. Change the header when you finish a file.

### Where `kennelId` comes from

```
Browser ──cookie kennel_session (JWT, HS256, payload { userID })──▶
  page.tsx / actions.ts
    └─ getCurrentKennel()            lib/dashboard/kennel.ts (REAL, React cache())
         └─ verifyKennelSession()    lib/auth.ts: jwtVerify(cookie, JWT_SECRET) → { userID }
         └─ prisma.kennel.findUnique({ where: { ownerId: userID } })
    └─ data function(kennel.id, …)   every query scoped with where: { kennelId }
```

`kennelId` is never read from a form field, a URL or a bound argument. A `.bind(null, id)` argument is **not** tamper-proof (Next.js encrypts closures, not bound arguments), so record ids that arrive that way are always checked against the session's kennel.

### Worked example: `getLitterStatusCounts`

Chosen because it's small, the `Litter` table already has everything it needs, and it shows the scoping pattern.

**Caller (unchanged):** `app/[locale]/dashboard/litters/(list)/page.tsx`

```ts
const kennel = await getCurrentKennel();
if (!kennel) notFound();
const [t, counts, litters] = await Promise.all([getTranslations("dashboard.litters"), getLitterStatusCounts(kennel.id), listLitters(kennel.id, { status })]);
```

**Today (mock):** `lib/dashboard/litters.ts`

```ts
export async function getLitterStatusCounts(kennelId: string): Promise<LitterStatusCounts> {
    void kennelId;
    const litters = getMockStore().litters;
    const count = (status: LitterStatus) => litters.filter((litter) => litter.status === status).length;
    return { all: litters.length, planned: count("PLANNED"), available: count("AVAILABLE"), reserved: count("RESERVED"), soldOut: count("SOLD_OUT") };
}
```

**Real:**

```ts
import { prisma } from "@/lib/db";

/** Counts per status for all of the kennel's litters (ignores the status filter). */
export async function getLitterStatusCounts(kennelId: string): Promise<LitterStatusCounts> {
    const rows = await prisma.litter.groupBy({
        by: ["status"],
        where: { kennelId }, // the only thing that scopes this to the signed-in kennel
        _count: { _all: true },
    });
    const count = (status: LitterStatus) => rows.find((row) => row.status === status)?._count._all ?? 0;
    return {
        all: rows.reduce((sum, row) => sum + row._count._all, 0),
        planned: count("PLANNED"),
        available: count("AVAILABLE"),
        reserved: count("RESERVED"),
        soldOut: count("SOLD_OUT"),
    };
}
```

The page, the tabs and their counts render exactly as before. `LitterStatus` in `types.ts` mirrors the Prisma enum, so no mapping is needed. (Don't ship this function alone: the litter list next to it would still be mock. Swap the whole Litters phase together.)

### Mutations follow the same shape

Server Action (exists) → parse `FormData` into a typed input with the `validation/*` parser (a whitelist) → validate → call the data function with `kennelId` from the session → the function checks ownership, writes, returns `{ ok: true } | { ok: false, fieldErrors, formError? }` → the action calls `refresh()` (from `next/cache`) and returns. You only rewrite the data function.

### The `mock/` folder

- Delete each `mock/*.ts` file once no `lib/dashboard/*.ts` imports it. Delete `mock/store.ts` and `mock/fixtures.ts` last (end of Phase 8). `grep -rn "mock/" lib/dashboard` tells you what's left.
- Before deleting, move the fixtures you want as dev data into a seed script (section 8).
- Also delete with the mock: the `DEV-ONLY TESTING AID` in `verification.ts` and `settings/verification/page.tsx`, `savedShellOverrides` and `readRegistration` in `kennelProfile.ts` (as exports), and the override lines in `getCurrentKennel`, `requestAccountDeletion` and `account.ts`.

---

## 2. Schema changes

Compared with the real `prisma/schema.prisma` and the live database. **Status:** NEW = add it; CHANGED = exists, needs a change; EXISTS = already there, don't add it.

### 2.1 Before any change: migrations are out of sync

`prisma/migrations/` holds two migrations (`init`, `remove_cpf`) that only create `Owner`, `Kennel` and `Dog`. Everything since (`Litter`, `Breed`, `KennelBreed`, `Media`, slugs…) was applied with `prisma db push`, and the database has **no `_prisma_migrations` table**. `prisma migrate dev` would therefore see drift and offer to reset the database.

**Recommendation:** baseline once, then use migrations from Phase 0 on (they're reviewable and repeatable in production): move the old folder aside, create `prisma/migrations/0_baseline/migration.sql` with `npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`, mark it applied with `npx prisma migrate resolve --applied 0_baseline`, then `npx prisma migrate dev` for each phase. Update the "Schema Updates" rule in `CLAUDE.md` (it says `db push`). If you prefer to stay on `db push`, keep doing it consistently; see decision D12.

### 2.2 Existing relations and their `onDelete` (read from the database)

| Relation | Today | Change |
| --- | --- | --- |
| `Kennel.ownerId → Owner` | RESTRICT | CHANGED → `Cascade` (account deletion removes the kennel) |
| `Dog.kennelId → Kennel` | RESTRICT | CHANGED → `Cascade` |
| `Litter.kennelId → Kennel` | RESTRICT | CHANGED → `Cascade` |
| `Litter.damId` / `sireId → Dog` | SET NULL | EXISTS (deleting a dog already clears them; `ENDPOINTS.md` says otherwise, see the report) |
| `Media.kennelId → Kennel` | CASCADE | EXISTS |
| `Media.dogId → Dog` | CASCADE | EXISTS |
| `Media.breedId → Breed` | SET NULL | EXISTS |
| `KennelBreed.kennelId → Kennel` | CASCADE | EXISTS |
| `KennelBreed.breedId → Breed` | RESTRICT | EXISTS (keep: a breed in use can't be deleted) |

### 2.3 Fields on existing models

| Model.field | Type | Status | Why | Needed by |
| --- | --- | --- | --- | --- |
| `Owner.fullName`, `Owner.passwordHash`, `Owner.phoneNumber` | | EXISTS | | getAccount, updateAccount, changePassword, getKennelProfile (fixture contact) |
| `Owner.locale` | `String?` | NEW | saved language (`en` / `pt-BR`) | getAccount, updateAccount |
| `Owner.deletionRequestedAt` | `DateTime?` | NEW | grace-period deletion (D3) | requestAccountDeletion, purge job |
| `Owner.passwordChangedAt` | `DateTime?` | NEW | reject sessions issued before a password change | changePassword, `verifyKennelSession` |
| `Owner.pendingEmail`, `pendingEmailTokenHash`, `pendingEmailExpiresAt` | `String?`, `String? @unique`, `DateTime?` | NEW (only with an email relay) | verify a new email before switching | updateAccount |
| `Owner.email` | `String @unique` | CHANGED (data) | lower-case existing rows; login/register must lower-case | login, register, updateAccount |
| `Kennel.cpf` | `String? @unique` | NEW | individual breeders (see conflict C1) | saveKennelProfile, getKennelProfile, getVerification, submitVerification |
| `Kennel.cnpj` | `String? @unique` | CHANGED (data) | stored formatted today (`"22.333.444/0001-55"`); normalize to 14 digits | same |
| `Kennel.cbkcRegistration` | `String?` | EXISTS | | saveKennelProfile, getVerification |
| `Kennel.logoUrl` | `String?` | EXISTS | | getKennelProfile, saveKennelProfile, getCurrentKennel |
| `Kennel.logoPublicId` | `String?` | NEW | delete the old asset on replace | saveKennelProfile |
| `Kennel.coverUrl`, `coverPublicId` | `String?` | NEW | cover image | getKennelProfile, saveKennelProfile, getProfileStrength, getOverview |
| `Kennel.breedingSince` | `Int?` | NEW | "Breeding since" year | getKennelProfile, saveKennelProfile |
| `Kennel.address` | `String?` | NEW | map address text | getKennelProfile, saveKennelProfile |
| `Kennel.latitude`, `longitude` | `Float?` | EXISTS | | saveKennelProfile, getProfileStrength |
| `Kennel.timeZone` | `String @default("America/Sao_Paulo")` | NEW | server-side "today" (conflict C6) | getKennelTimeZone, getViewerToday, every date-only comparison, jobs |
| `Kennel.ratingAverage`, `reviewCount` | `Float @default(0)`, `Int @default(0)` | NEW | directory/public cards (conflict C5) | review creation (public page); optional for getReviewSummary |
| `Kennel.isVerified` | `Boolean` | EXISTS | public badge; set by the approval | approval workflow (D4) |
| `Kennel.location` | `String` | EXISTS | keep `"City, ST"` in sync | saveKennelProfile |
| `Kennel.primaryBreeds` | `String[]` | EXISTS, DEPRECATED | superseded by `KennelBreed` | stop writing in saveKennelProfile; drop when the public site no longer reads it |
| `Dog.litterId` (+ `Litter.puppies`) | `String?` → `Litter`, `SetNull` | NEW | puppies belong to a litter | createDog, updateDog, getDogForEdit, linkPuppyToLitter, deleteLitter, litter stats, getOverview |
| `Dog.registrationNumber` | `String?` | NEW | | createDog, updateDog, getDogForEdit, listDogs |
| `Dog.archivedAt` | `DateTime?` | NEW | soft delete | archiveDog, restoreDog, every "non-archived" filter |
| `Dog.reservedForLeadId` | `String? @unique` → `Lead`, `SetNull` | NEW | who holds the puppy (conflict C2) | reservePuppy, releasePuppy, markLeadLost, reopenLead, getLeadDetail, deleteLead |
| `Dog.gender` | `String` | CHANGED (data) | values today: `"Male"` ×48, `"MALE"` ×1, `"Female"` ×47. Backfill to `MALE`/`FEMALE`; an enum later | all dog reads/writes |
| `Dog.photoUrls` | `String[]` | EXISTS, DEPRECATED | photos move to `Media` rows | dual-write in createDog/updateDog until the public site reads `Media` |
| `Dog.birthDate`, `Litter.bornAt`, `Litter.expectedGoHomeDate` | `DateTime?` | EXISTS | date-only values: write noon UTC (`dateOnlyToIso`), read `toISOString().slice(0, 10)` | dogs, litters |
| `Litter.name` | `String?` | EXISTS | the app requires it; optionally make it required after a backfill | litters |
| `Litter.availableCount` | `Int?` | EXISTS, unused by the dashboard | availability is computed from linked puppies | **the public kennel page reads it** (`app/[locale]/kennel/[slug]/page.tsx`): keep it in sync in the litter and dog mutations, or switch the public page to the computed count and drop it (D15) |
| `Media.category` | enum `MediaCategory` (`GALLERY`, `HEALTH_DOCUMENT`), default `GALLERY` | NEW | health documents share the table (conflict C3) | getDogForEdit, updateDog, listMedia |
| `Media.position` | `Int @default(0)` | NEW | gallery and dog-photo order | listMedia, addPhotos, addVideoLink, moveMedia, deleteMedia, updateDog |
| `Media.caption`, `label`, `fileName` | `String?` | NEW | captions / document labels / original names | updateMedia, listMedia, updateDog |
| `Media.provider`, `thumbnailUrl` | `VideoProvider?`, `String?` | NEW | video links | addVideoLink, listMedia |
| `Media.publicId` | `String?` | NEW | Cloudinary deletion | addPhotos, deleteMedia, updateDog |
| `Media.width`, `height` | `Int?` | NEW, optional | aspect ratios on the public page | addPhotos |

### 2.4 New models

| Model | Key fields | Constraints / indexes | onDelete | Needed by |
| --- | --- | --- | --- | --- |
| `Lead` | stage, source, email, followUpAt `@db.Date`, lostReason, litterId, dogId | `@@unique([kennelId, email])` (email lower-cased, CHECK in raw SQL), `@@index([kennelId, stage, lastActivityAt])`, `@@index([kennelId, followUpAt])` | kennel Cascade; litter, dog SetNull | `leads.ts`, `messages.ts`, shell, overview |
| `LeadEvent` | type, params `Json` | `@@index([leadId, createdAt])` | lead Cascade | lead mutations, getLeadDetail |
| `LeadNote` | body | `@@index([leadId, createdAt])` | lead Cascade | addLeadNote, getLeadDetail |
| `Conversation` | **kennelId** (denormalized), leadId `@unique`, lastMessageAt | `@@index([kennelId, lastMessageAt])` | kennel, lead Cascade | `messages.ts` |
| `Message` | direction, body, `Message.sharedDogId` (→ Dog), readAt | `@@index([conversationId, createdAt])`, `@@index([conversationId, direction, readAt])` | conversation Cascade; sharedDog SetNull | `messages.ts`, getLeadDetail |
| `WaitlistEntry` | position, note | `@@unique([litterId, leadId])`, `@@index([litterId, position])` | litter, lead Cascade | waitlist functions, litter stats |
| `Review` | rating, body, reply columns, report columns | `@@index([kennelId, createdAt])`, `inviteId @unique`, CHECK rating 1–5 | kennel Cascade; invite SetNull | `reviews.ts` |
| `ReviewInvite` | **tokenHash** `@unique`, expiresAt, usedAt | `@@index([kennelId, createdAt])` | kennel Cascade | createReviewInvite, public review page |
| `NotificationPreference` | type, emailEnabled | `@@id([ownerId, type])` | owner Cascade | `notificationPreferences.ts` |
| `VerificationRequest` | status, cbkcRegistration, documentUrls, documentPublicIds, dates, reviewerNote | `kennelId @unique` | kennel Cascade | `verification.ts`, profile strength, overview |
| `Notification` | type, params `Json`, readAt | `@@index([kennelId, createdAt])` | kennel Cascade | getNotifications (+ mark read, not built) |
| `ActivityEvent` | type, params `Json` | `@@index([kennelId, createdAt])` | kennel Cascade | getOverview |
| `KennelContact` | channel, value, isPublic | `@@id([kennelId, channel])` | kennel Cascade | getKennelProfile, saveKennelProfile (conflict C7) |
| `KennelSlugHistory` | slug `@id` | `@@index([kennelId])` | kennel Cascade | saveKennelProfile, checkSlugAvailability, public redirects (D5) |
| `AssetDeletion` | publicId, attempts, doneAt | `@@index([doneAt, createdAt])` | none (outlives what it pointed at) | deleteMedia, saveKennelProfile, account purge |

New enums: `LeadStage`, `LostReason`, `LeadSource`, `PreferredContact`, `LeadEventType`, `MessageDirection`, `MediaCategory`, `VideoProvider`, `ReviewReportReason`, `NotificationPreferenceType`, `VerificationStatus`, `NotificationType`, `ActivityType`, `ContactChannel`. Values in the draft; they match the string unions in `types.ts`.

**Raw SQL Prisma can't express** (add to the migration by hand, listed at the end of the draft): `CREATE EXTENSION unaccent` (accent-insensitive search; **not installed today**: installed extensions are `plpgsql`, `pg_stat_statements`, `uuid-ossp`, `pgcrypto`, `supabase_vault`), lower-case CHECKs on `Lead.email` and `Owner.email`, `Review.rating` 1–5, `cnpj`/`cpf` digit formats and "not both", `lostReason` set iff `stage = LOST`, an optional partial index for unread inbound messages.

### 2.5 Conflicts and overlaps: one resolution each

| # | Conflict | Resolution | Why |
| --- | --- | --- | --- |
| C1 | **Registration:** `Kennel.cpf` column vs a `registrationType` + `registrationNumber` pair | Keep `cnpj`, add `cpf String? @unique`, CHECK "not both". Normalize `cnpj` to digits first | Least change: `cnpj` and its unique index exist; the code already reads `{ cnpj, cpf }` (`readRegistration`); uniqueness per type comes for free. (A `cpf` column existed on `Owner` and was dropped by `remove_cpf`; this one is on `Kennel`, on purpose.) Decide on encryption at rest for CPF (D9) |
| C2 | **Who holds a puppy:** `Dog.reservedForLeadId` vs reusing `Lead.dogId` | Keep both, with different meanings: `Lead.dogId` = dog of **interest** (SetNull, many leads may point at one dog); `Dog.reservedForLeadId @unique` = the **hold**, the single source of truth for reservations. `reservePuppy` sets both | The unique column makes "one holder per puppy" a database guarantee and lets the guarded update work |
| C3 | **One `Media` table** vs separate gallery / dog-photo / document tables | One table + `category` (`GALLERY`, `HEALTH_DOCUMENT`) + `position`. A photo tagged with a dog is that dog's photo and in the gallery. **Every public query filters `category = GALLERY`**. Verification documents stay out of `Media` (in `VerificationRequest.documentUrls`) | Matches the existing table and `ENDPOINTS.md`'s recommendation; keeps private documents away from any gallery query |
| C4 | **Gallery position vs dog-photo order** (same rows) | `position` is global per `(kennelId, type)`. The dog page lists `where dogId` ordered by `position`; reordering in Dog-Edit permutes positions among that dog's rows only | One ordering, no second column |
| C5 | **`Kennel.ratingAverage` / `reviewCount`** vs computing live | Store them; update in the transaction that creates a review (public page). The dashboard's `getReviewSummary` can keep computing live | The directory sorts and lists many kennels; a live `AVG` per card is expensive |
| C6 | **`Kennel.timeZone`** nullable vs default | `String @default("America/Sao_Paulo")`, not null. `getKennelTimeZone` then never returns null; keep the cookie fallback only for "no kennel yet" | Jobs (reminders) have no browser and need a zone for every kennel |
| C7 | **Contact:** 10 columns on `Kennel` (`Kennel.contactPhone`, `contactPhonePublic`, …, as `types.ts` mentions) vs a `KennelContact` model | `KennelContact` (`@@id([kennelId, channel])`), one row per channel with a value | Extensible (a new network is an enum value), and "public only with a value" is natural: no row = no value |
| C8 | **`Owner.locale`** enum vs string | `String?`, validated in the app (`APP_LOCALES`) | Prisma enum values can't contain `-` (`pt-BR`) without `@map`; the list lives in code anyway |
| C9 | **`Owner.deletionRequestedAt`** vs deleting at once | Add it; delete for good after the grace period with a job (D3) | Recoverable mistakes; the public page is hidden immediately |
| C10 | **`Notification` vs `ActivityEvent`** (similar shape) | Two tables | Different lifecycles: notifications are per-reader state (`readAt`), activity is an append-only log |
| C11 | **Review reply:** columns on `Review` vs a `ReviewReply` model | Columns (`replyBody`, `replyCreatedAt`, `replyUpdatedAt`) | Exactly one reply per review |
| C12 | **Invite token** stored vs hashed | Store `tokenHash` (sha256) only | The link is shown once (`createReviewInvite`) and never listed again, so the plaintext is never needed |
| C13 | **`Conversation` scoping:** through the lead vs its own `kennelId` | Add `kennelId` to `Conversation` | Ownership check and inbox ordering become one indexed query |
| C14 | **`Kennel.isVerified`** vs `VerificationRequest.status` | Keep both: `isVerified` is the denormalized public flag, set/cleared in the same transaction as the decision | The directory filters on it constantly |
| C15 | Earlier idea **`Kennel.verificationRequestedAt`** (Step 1 notes) | Don't add: superseded by `VerificationRequest` | |

---

## 3. Cross-cutting rules

### Auth

Today: `/api/auth/login` signs a 7-day HS256 JWT `{ userID }` into the `kennel_session` cookie (httpOnly, `sameSite: lax`, `secure` in production). `verifyKennelSession()` (`lib/auth.ts`) verifies it. The dashboard layout redirects to `/login` without a session. Eight Server Action files each define their own `requireKennel()`/`requireKennelId()` around `getCurrentKennel()`.

**Create one helper** and use it in every Server Action:

```ts
// lib/dashboard/session.ts (server only)
/** The signed-in owner's kennel, or a redirect to /login. The ONLY source of kennelId and ownerId. */
export async function requireKennel(): Promise<CurrentKennel>
```

Body: `getCurrentKennel()`; if null, `redirect({ href: "/login", locale: await getLocale() })`. Then replace the local helpers in: `dogs/actions.ts`, `litters/actions.ts`, `leads/actions.ts`, `messages/actions.ts`, `media/actions.ts`, `reviews/actions.ts`, `settings/actions.ts`, `settings/account/actions.ts`, `settings/notifications/actions.ts`, `settings/verification/actions.ts`. Every exported action calls it **first**, before parsing input.

Also in Phase 0 (your auth work): reject tokens issued before `Owner.passwordChangedAt` (compare the JWT `iat`), add a sign-out (the sidebar has a `TODO(auth)`), and stop logging secrets (section 6).

### Ownership

Every query and write includes `kennelId`, so another kennel's id simply matches nothing:

| Record | How to check |
| --- | --- |
| Dog, Litter, Lead, Media, Review, ReviewInvite, Conversation (with C13) | `where: { id, kennelId }` on `findFirst` / `updateMany` / `deleteMany`; a `count === 0` or `null` result → `formError: { key: "notFound" }` (reads return `null` and the page 404s) |
| Message | through its conversation: `where: { id, conversation: { kennelId } }` |
| LeadEvent, LeadNote, WaitlistEntry | through the parent: `where: { id, lead: { kennelId } }` / `{ litter: { kennelId } }` |
| References inside input (dam/sire, litterId, dogId, sharedDogId, breedId, Media ids for bulk actions) | load them with `where: { id: { in: ids }, kennelId }` and compare counts **before** writing; for bulk actions use `updateMany`/`deleteMany` with `kennelId` so foreign ids are ignored |
| Owner-level (account, notification preferences) | `ownerId` from `requireKennel().ownerId`, never input |

Don't use `prisma.x.update({ where: { id } })` alone on kennel-owned data: `update` needs a unique `where`, so either check first with `findFirst({ where: { id, kennelId } })` in the same transaction or use `updateMany({ where: { id, kennelId } })`.

### Input handling

- Server Actions already parse `FormData` with whitelisting parsers (`parseDogFormData`, `parseLitterFormData`, `parseLeadFormData`, `parseKennelProfile`, `parseAccountDetails`…) and validate with `validation/*`. Data functions receive typed input. Build Prisma `data` objects field by field from that input.
- **Never** `data: { ...body }` or `...input` into Prisma. The old `/api/dogs` routes do exactly that (section 6).
- Re-run database-dependent checks inside the data function (breed exists, dog belongs to kennel, slug free), even if the action checked them: the data function is the trust boundary.
- Enums: validate against the allowed values (`DOG_STATUSES` in `validation/dog.ts`, the `STAGES` list in `validation/lead.ts`, …) before writing; Prisma will also reject unknown values.

### Transactions

Use `prisma.$transaction(async (tx) => { … })` for every function that writes more than one row or reads-then-writes:

| Function | Why |
| --- | --- |
| createDog, updateDog | dog + `Media` rows (photos with `position`, documents); dual-write `photoUrls` |
| linkPuppyToLitter | guarded: `updateMany({ where: { id, kennelId, litterId: null, archivedAt: null, lifeStage: "PUPPY", breed }, data: { litterId } })`, 0 rows → `puppyNotLinkable` |
| deleteLitter | puppies are cleared by `SetNull`, waitlist by `Cascade`; one statement, but keep it in a transaction if you also write an activity event |
| createLead, updateLead, moveLeadStage, setFollowUp, markFollowUpDone, reopenLead | the row + its `LeadEvent` |
| markLeadLost | stage + event + optional release (dog + event) |
| **reservePuppy** | guarded update (below) + lead + event |
| releasePuppy | dog + lead + event |
| addToWaitlist, removeFromWaitlist, deleteLead | positions (`max + 1`, renumber) |
| sendMessage | message + `Conversation.lastMessageAt` + `Lead.lastActivityAt` + auto stage change + event |
| addPhotos, addVideoLink, moveMedia, deleteMedia | contiguous `position`; delete also enqueues `AssetDeletion` |
| saveKennelProfile | every section, `KennelBreed` replace, `KennelSlugHistory`, `AssetDeletion`, verification back to review |
| submitVerification, withdrawVerification | status + dates (and keep `Kennel.cbkcRegistration` in sync) |
| Public review page (not built) | review + invite `usedAt` + `ratingAverage`/`reviewCount` + activity + notification |
| Public contact form (not built) | lead (or existing lead by email) + conversation + INBOUND message + events + activity + notification |
| Account purge job | assets enqueued first, then `delete Kennel` (cascades) and `delete Owner` |

**Guarded update for reservations** (no read-then-write race):

```ts
await prisma.$transaction(async (tx) => {
    const held = await tx.dog.count({ where: { kennelId, reservedForLeadId: leadId } });
    if (held > 0) return failed("alreadyHoldsPuppy");
    const { count } = await tx.dog.updateMany({
        where: { id: dogId, kennelId, status: "AVAILABLE_PUPPY", archivedAt: null },
        data: { status: "RESERVED", reservedForLeadId: leadId },
    });
    if (count === 0) return failed("puppyJustReserved"); // someone else got it
    // then: lead.stage = RESERVED, lead.dogId = dogId, LeadEvent PUPPY_RESERVED { dogId, dogName }
});
```

`Dog.reservedForLeadId @unique` backs this up: a second hold for the same lead fails with P2002 (→ `alreadyHoldsPuppy`).

**Positions** (waitlist, media): two concurrent appends can pick the same `max + 1`. Inside the transaction, lock the parent first: `await tx.$executeRaw\`SELECT 1 FROM "Kennel" WHERE id = ${kennelId} FOR UPDATE\`` (media) or the litter row (waitlist), then compute.

### Time zone

- `Kennel.timeZone` (IANA) decides the kennel's calendar day. `getViewerToday()` (`lib/dashboard/viewerDate.ts`) already reads it via `getKennelTimeZone(kennelId)` and returns `"YYYY-MM-DD"`; when the column exists, `getKennelTimeZone` becomes `prisma.kennel.findUnique({ where: { id }, select: { timeZone: true } })`.
- Pass `today` into queries; compare date-only with date-only: `followUpAt: { lte: new Date(\`${today}T00:00:00Z\`) }` on a `@db.Date` column, or in SQL `"followUpAt" <= (now() AT TIME ZONE k."timeZone")::date`.
- Jobs compute "today" per kennel (`AT TIME ZONE "timeZone"`), never with the server's zone.
- Existing `DateTime` date-only columns (`Dog.birthDate`, `Litter.bornAt`, `Litter.expectedGoHomeDate`): write noon UTC (`dateOnlyToIso` in `age.ts`), read the first 10 characters of `toISOString()`. New date-only columns use `@db.Date`.

### Images

- Uploads go browser → Cloudinary (unsigned preset `kennel_app_preset`, `ImageUploader`), then the URL (and `publicId`) reaches a Server Action. Accept only `https://res.cloudinary.com/<your cloud>/` URLs for new images. Today the prefix is checked for gallery photos (`media/actions.ts`), verification documents (`validation/verification.ts`) and logo/cover (`validation/kennelProfile.ts`), but **Dog-Edit photos and health documents accept any `https://` URL** (`validation/dog.ts`, `isHttpUrl`). Add the check there, and tighten all of them to your cloud name. Store `publicId` next to every URL (`Media.publicId`, `Kennel.logoPublicId`, `Kennel.coverPublicId`, `VerificationRequest.documentPublicIds`).
- Deleting or replacing: in the same transaction, insert `AssetDeletion { publicId }`; a job calls `cloudinary.uploader.destroy(publicId)` with `CLOUDINARY_API_SECRET` (env vars exist: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_URL`). A failed delete leaves an orphan file, never a broken page.
- Unsigned presets can be abused to upload to your cloud. In the Cloudinary console restrict the preset (allowed formats `jpg, jpeg, png, webp, heic`, max 10 MB, a folder). See D10 for signed uploads.
- `next.config.ts` has no `images` config today, so the dashboard uses `<img>` (15 lint warnings). To move to `next/image`, add `images.remotePatterns` for `res.cloudinary.com`, `place.dog` (seed data), `img.youtube.com`, `i.vimeocdn.com`.

### Background jobs

| Job | When | Simplest way |
| --- | --- | --- |
| Account purge | daily; owners with `deletionRequestedAt` older than the grace period (D3) | a protected route (`/api/cron/purge`, checks `CRON_SECRET`) called by Vercel Cron / Supabase `pg_cron` |
| Asset deletion | every few minutes; `AssetDeletion where doneAt is null and attempts < 5` | same mechanism; mark `doneAt` or bump `attempts` + `lastError` |
| Review-invite expiry | check `expiresAt` when the link is opened (no job needed); optional weekly cleanup of old unused invites | the public page refuses expired tokens |
| Follow-up due notifications | daily per kennel at its morning: leads with `followUpAt = today` → `Notification FOLLOW_UP_DUE` (+ email if enabled) | cron route iterating kennels by `timeZone` |
| Verification reminder | e.g. weekly while `NOT_SUBMITTED` → `Notification VERIFICATION_REMINDER` | cron route |
| Email digest / notification emails | when an email relay exists (D1) | cron route or send inline |

### Email

| Feature | Needs email for | Without a relay (today) |
| --- | --- | --- |
| Messages | delivering OUTBOUND replies to the buyer; receiving buyer replies as INBOUND | stored only; the UI never claims delivery (keep it so) |
| Review invites | sending the link | `emailSent: false`, the UI shows the link to copy |
| Email change | confirming the new address before switching | **don't switch unverified addresses in production**: either block email changes or accept the risk knowingly (D7) |
| Notification preferences | sending the emails | saved, no effect; the UI says so |
| Password reset | the reset link | **no "forgot password" flow exists** (not in the code); needs email |
| Account deletion | confirmation + "you can still cancel" | none |
| Verification decision | approved/rejected notice | the dashboard status is the notice |

### Errors

- Mutations return `SimpleMutationResult` / `MutationFailure` (`types.ts`): `{ ok: true } | { ok: false, fieldErrors: { field: { key, params? } }, formError?: { key, params? } }`. Actions turn them into `ActionState` with `fromResult()` / `failed()` (`lib/dashboard/actionState.ts`), which also calls `refresh()` on success. Keys are under `dashboard.common.errors.*` and **already exist** for every case below.
- Map Prisma errors **inside the data function**, never let them reach the client:

| Prisma error | Constraint | Return |
| --- | --- | --- |
| `P2002` | `Lead (kennelId, email)` | `fieldErrors.email = duplicateLeadEmail`, `formError = duplicateLead { leadId, name }` (look the lead up) |
| `P2002` | `Kennel.slug` or `KennelSlugHistory.slug` | `fieldErrors.slug = slugTaken` |
| `P2002` | `Kennel.cnpj` / `Kennel.cpf` | `fieldErrors.registrationNumber = registrationTaken` |
| `P2002` | `Owner.email` | `fieldErrors.email = emailTaken` |
| `P2002` | `WaitlistEntry (litterId, leadId)` | `formError = alreadyOnWaitlist` |
| `P2002` | `Dog.reservedForLeadId` | `formError = alreadyHoldsPuppy` |
| `P2002` | `Conversation.leadId` | not an error: return the existing conversation (`startConversation` is idempotent) |
| `P2002` | `Dog (kennelId, slug)` | retry with the next slug (as `/api/dogs` does) |
| `P2025` | record to update/delete not found | `formError = notFound` |
| `P2003` | foreign key | `formError = notFound` (a referenced row vanished) |
| anything else | | log it, `formError = generic` |

- **With the `@prisma/adapter-pg` driver adapter the violated fields are not in `meta.target`.** `app/api/kennel/route.ts` already handles this: read `meta.target ?? meta.driverAdapterError.cause.constraint.fields`. Put that in one helper (`uniqueViolationFields(error): string[] | null`) and use it everywhere.

---

## 4. Build order

"Works after every phase" means: every screen renders, and the screens of the finished phase show real data and save to the database. Screens of later phases still show mock data; where a real screen links to mock data (or the reverse), the phase says so.

### Phase 0: Foundations

- **Goal:** a safe base: one session helper, migrations you can trust, the old API holes closed, the time zone stored.
- **Prerequisites:** none.
- **Schema first:** baseline migrations (2.1); `Kennel.timeZone`; lower-case `Owner.email` (data + CHECK); normalize `Kennel.cnpj` to digits; backfill `Dog.gender` to `MALE`/`FEMALE`; `CREATE EXTENSION unaccent`.
- **Functions:** `lib/dashboard/session.ts` → `requireKennel` (new) and use it in every actions file; `kennelProfile.ts` → `getKennelTimeZone` (real); `kennel.ts` → `getCurrentKennel` (unchanged for now; its mock overrides go in Phases 1 and 7). Auth (yours): login/register fixes, sign-out, `passwordChangedAt` check. Old routes: remove or patch per section 6.
- **Screens that come alive:** none visibly; "today" now follows the kennel's zone.
- **Hardest:** baselining migrations without touching data.
- **Test:** log in; every dashboard screen loads; `npx prisma migrate status` is clean; `curl -X PATCH /api/dogs/<id>` is gone (404) or rejects `kennelId`.
- **Done when:** every action calls `requireKennel()` first, migrations are baselined, and section 6's API items are closed.

### Phase 1: Account and notification preferences (quick win)

- **Goal:** Settings → Account and Notifications save to the database.
- **Prerequisites:** Phase 0.
- **Schema first:** `Owner.locale`, `Owner.deletionRequestedAt`, `Owner.passwordChangedAt`, `NotificationPreference` + enum.
- **Functions:** `account.ts` → `getAccount`, `updateAccount`, `changePassword`, `requestAccountDeletion`; `notificationPreferences.ts` → `getNotificationPreferences`, `updateNotificationPreferences`. Remove the `accountOverrides` lines from `getCurrentKennel`.
- **Screens:** Settings → Account, Settings → Notifications; the sidebar owner name.
- **Hardest:** `changePassword` (bcrypt compare, hash, invalidate other sessions). `requestAccountDeletion` only sets `deletionRequestedAt` (and hides the public page) until the purge job (Phase 9); update the UI text from "Preview only" when it becomes real.
- **Test:** change name → sidebar updates after reload; change language → URL locale switches and persists; wrong current password → inline error; correct one → old session in another browser is logged out; preferences survive a server restart.
- **Done when:** `account.ts` and `notificationPreferences.ts` import nothing from `mock/`.

### Phase 2: Dogs

- **Goal:** the roster and Dog-Edit on real `Dog` + `Media` rows.
- **Prerequisites:** Phase 0.
- **Schema first:** `Dog.litterId` (+ `Litter.puppies`), `Dog.registrationNumber`, `Dog.archivedAt`, `Dog.kennel` Cascade; `Media.category`, `position`, `label`, `fileName`, `publicId`; `MediaCategory` enum. Backfill: one `Media` row (`PHOTO`, `GALLERY`, `dogId`) per `Dog.photoUrls` entry with `position` in array order.
- **Functions:** `dogs.ts` → `listDogs`, `getDogStatusCounts`, `getDogForEdit`, `getKennelBreeds` (real `KennelBreed`), `getLitterOptions`, `createDog`, `updateDog`, `updateDogStatus`, `archiveDog`, `restoreDog`, `deleteDog`.
- **Screens:** Dogs list (tabs, search, filters, pagination), Add dog, Edit dog (photos, documents, archive, restore, delete).
- **Still mock after this phase:** Litters, Leads, Messages, Media and Overview still read mock dogs (`store.dogs`), so a dog you add won't appear there yet. The real kennel's breeds (e.g. Husky) replace the mock Labrador/Poodle on Dog-Edit only.
- **Hardest:** `updateDog`: syncing the photo and document arrays to `Media` rows (delete removed, upsert the rest with new `position`, enqueue `AssetDeletion` for removed photos) in one transaction. Also accent-insensitive search (`unaccent`, raw `$queryRaw` or a generated search column).
- **Test:** search "perola" finds "Pérola"; archive → disappears from All, appears in Archived, restore keeps its status; reorder photos → cover changes on the card; delete a dog that is a litter's dam → litter keeps working (dam cleared by SET NULL); another kennel's dog id in the URL → 404.
- **Done when:** `dogs.ts` has no `mock/` import and the public dog page still shows photos (dual-write).

### Phase 3: Litters

- **Goal:** litter list, detail and form on real data; puppies linked to litters.
- **Prerequisites:** Phase 2 (puppies, parents).
- **Schema first:** `Litter.kennel` Cascade, `@@index([kennelId, status])` (`Dog.litterId` came in Phase 2).
- **Functions:** `litters.ts` → `listLitters`, `getLitterStatusCounts`, `getLitterDetail`, `getLitterForEdit`, `getLitterFormOptions`, `getLinkablePuppies`, `createLitter`, `updateLitter`, `updateLitterStatus`, `deleteLitter`, `linkPuppyToLitter`. (`getLitterWaitlist` moves with Leads in Phase 4.)
- **Screens:** Litters master-detail, New/Edit litter, Add puppy dialog; Dog-Edit's litter selector now matches the litters list.
- **Still mock:** waitlists (Phase 4); `onWaitlist` in litter stats shows the mock count until then.
- **Hardest:** `getLitterDetail` / the computed stats (`max(puppyCount, linked)`, available, reserved, placed share) in one query; `getLitterFormOptions` keeping an archived current parent selectable.
- **Test:** create a planned litter without a birth date; link a puppy of another breed → refused; change litter status → puppies' statuses unchanged; delete litter → puppies remain with no litter.
- **Done when:** `litters.ts` no longer reads `store.litters` or `store.dogs`.

### Phase 4: Leads, Messages and waitlists

- **Goal:** the pipeline, the lead page, the inbox and waitlists on real data.
- **Prerequisites:** Phases 2 and 3 (reservations, waitlists, shared dogs).
- **Schema first:** `Lead`, `LeadEvent`, `LeadNote`, `Conversation` (with `kennelId`), `Message`, `WaitlistEntry`, `Dog.reservedForLeadId`; enums `LeadStage`, `LostReason`, `LeadSource`, `PreferredContact`, `LeadEventType`, `MessageDirection`; the lead email CHECK.
- **Functions:** `leads.ts` → all 23 (`listLeadsBoard`, `listLeadsTable`, `getFollowUpSummary`, `getLeadSummary`, `getLeadFormOptions`, `getUpcomingFollowUps`, `countNewLeads`, `getLeadDetail`, `getWaitlistOptions`, `getReservablePuppies`, `createLead`, `updateLead`, `moveLeadStage`, `addLeadNote`, `setFollowUp`, `markFollowUpDone`, `deleteLead`, `markLeadLost`, `reopenLead`, `reservePuppy`, `releasePuppy`, `addToWaitlist`, `removeFromWaitlist`); `messages.ts` → `listConversations`, `getConversationThread`, `getConversationForLead`, `getShareableDogs`, `getUnreadSummary`, `sendMessage`, `markConversationRead`, `startConversation` (`toThreadMessage` stays); `litters.ts` → `getLitterWaitlist`; `shell.ts` → `getNavCounts`.
- **Screens:** Leads board and list, Add/Edit lead, lead page, Messages, litter waitlists, sidebar badges.
- **Outside `lib/dashboard` (needed for INBOUND messages):** the public contact form creates leads (`PUBLIC_FORM`) with a conversation and first message, in one transaction; without it, no buyer message ever arrives.
- **Hardest:** `reservePuppy` (guarded update) and `getLeadDetail` (timeline = union of events, notes, messages + reservation + waitlists). In Messages: `listConversations` with unread counts and accent-insensitive search over message bodies.
- **Test:** drag a card New → Contacted; reply to a New lead → it moves to Contacted with an "auto" event; reserve the same puppy from two browser tabs → the second gets "just reserved by someone else"; mark lost with release → puppy back to Available; reopen → previous stage (or Interested); delete lead holding a puppy → refused; waitlist add/remove renumbers positions; duplicate email (different case) → link to the existing lead.
- **Done when:** `leads.ts`, `messages.ts`, `shell.ts#getNavCounts` and the waitlist read no mock data.

### Phase 5: Media

- **Goal:** the gallery on real `Media` rows, with Cloudinary deletion.
- **Prerequisites:** Phase 2 (dog tags, shared `Media` columns).
- **Schema first:** `Media.caption`, `provider`, `thumbnailUrl`, `width`, `height`; `VideoProvider` enum; `AssetDeletion`; the gallery index.
- **Functions:** `media.ts` → `listMedia`, `getMediaCounts`, `getMediaFilterOptions`, `addPhotos`, `addVideoLink`, `updateMedia`, `tagMedia`, `deleteMedia`, `moveMedia`.
- **Screens:** Media (photos, videos, filters, bulk tag/delete, reorder).
- **Hardest:** `moveMedia` / `deleteMedia` keeping `position` contiguous under concurrency (lock, then shift a range with one `updateMany` using `increment`/`decrement`).
- **Test:** upload 3 photos → appended at the end; move one to the start from page 2; bulk delete 2 → positions contiguous, `AssetDeletion` rows created; tag with a dog of another breed → `dogBreedMismatch`; ids from another kennel in a bulk action → ignored.
- **Done when:** `media.ts` has no `mock/` import; dog photos and gallery photos agree.

### Phase 6: Reviews

- **Goal:** the Reviews screen on real data, plus the public page that creates reviews.
- **Prerequisites:** Phase 0.
- **Schema first:** `Review`, `ReviewInvite`, `ReviewReportReason`, `Kennel.ratingAverage`, `Kennel.reviewCount`, rating CHECK.
- **Functions:** `reviews.ts` → `getReviewSummary`, `listReviews`, `postReviewReply`, `reportReview`, `createReviewInvite`.
- **Outside `lib/dashboard`:** `/{locale}/review/{token}` (public): hash the token, find the invite (unused, not expired), create the review (`verified: true`, `inviteId`), set `usedAt`, update the aggregates, write `ActivityEvent`/`Notification` (Phase 8 tables, or add them then), all in one transaction. Rate-limit it.
- **Screens:** Reviews (summary, tabs, reply, report, invite card).
- **Hardest:** the public review creation transaction (single use under concurrency: `updateMany({ where: { id, usedAt: null } })` and check the count).
- **Test:** create an invite → link shown once; use it twice → second refused; reply, edit reply; report twice in two tabs → `alreadyReported`; average and distribution match the rows.
- **Done when:** `reviews.ts` has no `mock/` import and an invite can produce a real review.

### Phase 7: Kennel profile and verification

- **Goal:** Settings → Kennel profile and Verification save to the database.
- **Prerequisites:** Phases 0–2 (breeds, dog counts), 5 (`AssetDeletion`).
- **Schema first:** `Kennel.cpf`, `logoPublicId`, `coverUrl`, `coverPublicId`, `breedingSince`, `address`; `KennelContact` + `ContactChannel`; `KennelSlugHistory`; `VerificationRequest` + `VerificationStatus`; registration CHECKs.
- **Functions:** `kennelProfile.ts` → `getKennelProfile`, `saveKennelProfile`, `checkSlugAvailability`, `getProfileStrength`, `lookupAddress` (real geocoder, D6), `readRegistration` (becomes an internal query; drop the export), `savedShellOverrides` (delete; remove its use in `getCurrentKennel` and `requestAccountDeletion`); `listBreedOptions` is already real. `verification.ts` → `getVerification`, `getVerificationStatus`, `submitVerification`, `withdrawVerification` (delete the DEV-ONLY aid).
- **Screens:** Settings → Kennel profile, Settings → Verification, the sidebar name/location/logo, Overview's profile checklist items.
- **Hardest:** `saveKennelProfile`: all sections in one transaction, `KennelBreed` replace, slug history + uniqueness (P2002), registration change sending verification back to review, `AssetDeletion` for replaced images, `location` kept in sync.
- **Test:** change slug → old slug redirects (if D5) and can't be claimed by another kennel; save with a taken slug via a crafted request → `slugTaken`; switch CNPJ → CPF with a valid number → stored, the other cleared; registration change while APPROVED → status PENDING and `isVerified` false; remove the cover → `AssetDeletion` row; the full CPF/CNPJ never appears in page HTML.
- **Done when:** `kennelProfile.ts`, `verification.ts` and `getCurrentKennel` read no mock data.

### Phase 8: Overview, notifications, activity; delete `mock/`

- **Goal:** Overview and the bell from real tables; the mock folder gone.
- **Prerequisites:** Phases 1–7.
- **Schema first:** `Notification` + `NotificationType`, `ActivityEvent` + `ActivityType`. Then add the writes: `ActivityEvent` in `createLead`, the public contact form and inbound messages (`NEW_LEAD`, `NEW_MESSAGE`), review creation (`NEW_REVIEW`), `updateDogStatus`/`updateDog` (`DOG_STATUS_CHANGED`), `updateLitter`/`updateLitterStatus` when a litter gets a birth date (`LITTER_BORN`); `Notification` from the same places + jobs.
- **Functions:** `overview.ts` → `getOverview`; `shell.ts` → `getNotifications`; new: a mark-read mutation for the bell (not built in the UI yet).
- **Screens:** Overview (checklist, metrics, activity, coming up), notifications bell.
- **Hardest:** `getOverview`: four independent aggregates (`Promise.all`), go-home dates compared as date-only with the kennel's today.
- **Test:** add a lead → appears in activity and New leads; change a dog's status → activity item with the snapshotted name; rename the dog → old item keeps the old name; checklist ticks as profile items are completed.
- **Done when:** `grep -rn "mock/" lib/dashboard` returns nothing and `lib/dashboard/mock/` is deleted.

### Phase 9: Background jobs and email

- **Goal:** the time-based and external work.
- **Prerequisites:** the tables they touch (Phases 1, 5, 6, 8).
- **Functions:** no `lib/dashboard` functions; the jobs in section 3 (account purge, asset deletion, follow-up and verification notifications), plus email sending once D1 is decided (invites, notifications, email change, password reset).
- **Hardest:** the account purge (assets queued first, then one cascade delete) and idempotent retries.
- **Test:** request deletion, move `deletionRequestedAt` back past the grace period, run the job → kennel and owner gone, assets queued; run it twice → no error.
- **Done when:** each job runs on a schedule, logs failures, and is safe to re-run.

---

## 5. Function index

Every exported function in `lib/dashboard/*.ts`. "Phase" is where it becomes real; **R** = already real logic, keep as is. Links go to the contract in `ENDPOINTS.md`.

| File | Function | Phase | Models touched | Contract |
| --- | --- | --- | --- | --- |
| account.ts | `getAccount` | 1 | Owner | [Account](../lib/dashboard/ENDPOINTS.md#account-accountts) |
| account.ts | `updateAccount` | 1 | Owner | [Account](../lib/dashboard/ENDPOINTS.md#account-accountts) |
| account.ts | `changePassword` | 1 | Owner | [Account](../lib/dashboard/ENDPOINTS.md#account-accountts) |
| account.ts | `requestAccountDeletion` | 1 | Owner, Kennel | [Account](../lib/dashboard/ENDPOINTS.md#account-accountts) |
| actionState.ts | `failed` | R | – | [section 3, Errors](#errors) |
| actionState.ts | `fromResult` | R | – | [section 3, Errors](#errors) |
| age.ts | `ageOf` | R | – | – |
| age.ts | `dateOnlyToIso` | R | – | [section 3, Time zone](#time-zone) |
| dateOnly.ts | `resolveTimeZone` | R | – | [Today](../lib/dashboard/ENDPOINTS.md#today) |
| dateOnly.ts | `dateInZone` | R | – | [Today](../lib/dashboard/ENDPOINTS.md#today) |
| dateOnly.ts | `daysBetween` | R | – | – |
| dateOnly.ts | `addDays` | R | – | – |
| dogs.ts | `listDogs` | 2 | Dog, Media | [Dogs](../lib/dashboard/ENDPOINTS.md#dogs-dogsts) |
| dogs.ts | `getDogStatusCounts` | 2 | Dog | [Dogs](../lib/dashboard/ENDPOINTS.md#dogs-dogsts) |
| dogs.ts | `getDogForEdit` | 2 | Dog, Media | [Dogs](../lib/dashboard/ENDPOINTS.md#dogs-dogsts) |
| dogs.ts | `getKennelBreeds` | 2 | KennelBreed, Breed | [Dogs](../lib/dashboard/ENDPOINTS.md#dogs-dogsts) |
| dogs.ts | `getLitterOptions` | 2 | Litter, Dog | [Dogs](../lib/dashboard/ENDPOINTS.md#dogs-dogsts) |
| dogs.ts | `createDog` | 2 | Dog, Media | [Dogs](../lib/dashboard/ENDPOINTS.md#dogs-dogsts) |
| dogs.ts | `updateDog` | 2 | Dog, Media, AssetDeletion | [Dogs](../lib/dashboard/ENDPOINTS.md#dogs-dogsts) |
| dogs.ts | `updateDogStatus` | 2 | Dog (ActivityEvent from Phase 8) | [Dogs](../lib/dashboard/ENDPOINTS.md#dogs-dogsts) |
| dogs.ts | `archiveDog` | 2 | Dog | [Dogs](../lib/dashboard/ENDPOINTS.md#dogs-dogsts) |
| dogs.ts | `restoreDog` | 2 | Dog | [Dogs](../lib/dashboard/ENDPOINTS.md#dogs-dogsts) |
| dogs.ts | `deleteDog` | 2 | Dog (cascades Media; SET NULL on Litter, Lead, Message) | [Dogs](../lib/dashboard/ENDPOINTS.md#dogs-dogsts) |
| kennel.ts | `getCurrentKennel` | 0 (overrides removed in 1 and 7) | Kennel, Owner | [Shell](../lib/dashboard/ENDPOINTS.md#shell-kennelts-shellts) |
| kennelPreview.ts | `getKennelPublicPreview` | R | – | [Kennel profile](../lib/dashboard/ENDPOINTS.md#kennel-profile-kennelprofilets) |
| kennelProfile.ts | `readRegistration` | 7 (becomes internal) | Kennel | [Verification](../lib/dashboard/ENDPOINTS.md#verification-verificationts) |
| kennelProfile.ts | `getKennelTimeZone` | 0 | Kennel | [Kennel profile](../lib/dashboard/ENDPOINTS.md#kennel-profile-kennelprofilets) |
| kennelProfile.ts | `savedShellOverrides` | 7 (delete) | – | [Shell](../lib/dashboard/ENDPOINTS.md#shell-kennelts-shellts) |
| kennelProfile.ts | `getKennelProfile` | 7 | Kennel, KennelBreed, Breed, KennelContact, Dog, Litter, VerificationRequest | [Kennel profile](../lib/dashboard/ENDPOINTS.md#kennel-profile-kennelprofilets) |
| kennelProfile.ts | `listBreedOptions` | R (already Prisma) | Breed | [Kennel profile](../lib/dashboard/ENDPOINTS.md#kennel-profile-kennelprofilets) |
| kennelProfile.ts | `checkSlugAvailability` | 7 | Kennel, KennelSlugHistory | [Kennel profile](../lib/dashboard/ENDPOINTS.md#kennel-profile-kennelprofilets) |
| kennelProfile.ts | `saveKennelProfile` | 7 | Kennel, KennelBreed, KennelContact, KennelSlugHistory, VerificationRequest, AssetDeletion | [Kennel profile](../lib/dashboard/ENDPOINTS.md#kennel-profile-kennelprofilets) |
| kennelProfile.ts | `lookupAddress` | 7 | – (geocoder) | [Kennel profile](../lib/dashboard/ENDPOINTS.md#kennel-profile-kennelprofilets) |
| kennelProfile.ts | `getProfileStrength` | 7 | via getKennelProfile | [Kennel profile](../lib/dashboard/ENDPOINTS.md#kennel-profile-kennelprofilets) |
| leads.ts | `listLeadsBoard` | 4 | Lead, Litter, Dog, Message | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `listLeadsTable` | 4 | Lead, Litter, Dog, Message | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `getFollowUpSummary` | 4 | Lead | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `getLeadSummary` | 4 | Lead | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `getLeadFormOptions` | 4 | KennelBreed, Litter, Dog | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `getUpcomingFollowUps` | 4 | Lead | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `countNewLeads` | 4 | Lead | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `getLeadDetail` | 4 | Lead, LeadEvent, LeadNote, Message, Conversation, Dog, Litter, WaitlistEntry | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `getWaitlistOptions` | 4 | Litter, WaitlistEntry | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `getReservablePuppies` | 4 | Dog, Litter, Media | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `createLead` | 4 | Lead, LeadEvent | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `updateLead` | 4 | Lead, LeadEvent | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `moveLeadStage` | 4 | Lead, LeadEvent | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `addLeadNote` | 4 | LeadNote | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `setFollowUp` | 4 | Lead, LeadEvent | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `markFollowUpDone` | 4 | Lead, LeadEvent | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `deleteLead` | 4 | Lead (cascades), WaitlistEntry | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `markLeadLost` | 4 | Lead, LeadEvent, Dog | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `reopenLead` | 4 | Lead, LeadEvent, Dog | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `reservePuppy` | 4 | Dog, Lead, LeadEvent | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `releasePuppy` | 4 | Dog, Lead, LeadEvent | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `addToWaitlist` | 4 | WaitlistEntry, LeadEvent | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| leads.ts | `removeFromWaitlist` | 4 | WaitlistEntry, LeadEvent | [Leads](../lib/dashboard/ENDPOINTS.md#leads-leadsts) |
| litters.ts | `computeLitterStats` | 3 (takes real rows) | – | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `litterLabel` | 3 (takes real rows) | – | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `listLitters` | 3 | Litter, Dog, WaitlistEntry | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `getLitterStatusCounts` | 3 | Litter | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `getLitterDetail` | 3 | Litter, Dog, Media | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `getLitterWaitlist` | 4 | WaitlistEntry, Lead | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `getLitterForEdit` | 3 | Litter | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `getLitterFormOptions` | 3 | KennelBreed, Dog | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `getLinkablePuppies` | 3 | Dog, Media | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `createLitter` | 3 | Litter | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `updateLitter` | 3 | Litter | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `updateLitterStatus` | 3 | Litter | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `deleteLitter` | 3 | Litter (SET NULL on Dog, cascades WaitlistEntry) | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| litters.ts | `linkPuppyToLitter` | 3 | Dog | [Litters](../lib/dashboard/ENDPOINTS.md#litters-litterts) |
| media.ts | `listMedia` | 5 | Media, Breed, Dog | [Media](../lib/dashboard/ENDPOINTS.md#media-mediats) |
| media.ts | `getMediaCounts` | 5 | Media | [Media](../lib/dashboard/ENDPOINTS.md#media-mediats) |
| media.ts | `getMediaFilterOptions` | 5 | KennelBreed, Dog | [Media](../lib/dashboard/ENDPOINTS.md#media-mediats) |
| media.ts | `addPhotos` | 5 | Media | [Media](../lib/dashboard/ENDPOINTS.md#media-mediats) |
| media.ts | `addVideoLink` | 5 | Media | [Media](../lib/dashboard/ENDPOINTS.md#media-mediats) |
| media.ts | `updateMedia` | 5 | Media | [Media](../lib/dashboard/ENDPOINTS.md#media-mediats) |
| media.ts | `tagMedia` | 5 | Media | [Media](../lib/dashboard/ENDPOINTS.md#media-mediats) |
| media.ts | `deleteMedia` | 5 | Media, AssetDeletion | [Media](../lib/dashboard/ENDPOINTS.md#media-mediats) |
| media.ts | `moveMedia` | 5 | Media | [Media](../lib/dashboard/ENDPOINTS.md#media-mediats) |
| messages.ts | `initialsOf` | R | – | [Messages](../lib/dashboard/ENDPOINTS.md#messages-messagests) |
| messages.ts | `toThreadMessage` | 4 (takes real rows) | – | [Messages](../lib/dashboard/ENDPOINTS.md#messages-messagests) |
| messages.ts | `listConversations` | 4 | Conversation, Message, Lead, Dog | [Messages](../lib/dashboard/ENDPOINTS.md#messages-messagests) |
| messages.ts | `getConversationThread` | 4 | Conversation, Message, Lead, Dog, Litter, Media | [Messages](../lib/dashboard/ENDPOINTS.md#messages-messagests) |
| messages.ts | `getConversationForLead` | 4 | Conversation | [Messages](../lib/dashboard/ENDPOINTS.md#messages-messagests) |
| messages.ts | `getShareableDogs` | 4 | Dog, Media | [Messages](../lib/dashboard/ENDPOINTS.md#messages-messagests) |
| messages.ts | `getUnreadSummary` | 4 | Message, Conversation | [Messages](../lib/dashboard/ENDPOINTS.md#messages-messagests) |
| messages.ts | `sendMessage` | 4 | Message, Conversation, Lead, LeadEvent | [Messages](../lib/dashboard/ENDPOINTS.md#messages-messagests) |
| messages.ts | `markConversationRead` | 4 | Message | [Messages](../lib/dashboard/ENDPOINTS.md#messages-messagests) |
| messages.ts | `startConversation` | 4 | Conversation | [Messages](../lib/dashboard/ENDPOINTS.md#messages-messagests) |
| notificationPreferences.ts | `getNotificationPreferences` | 1 | NotificationPreference | [Notification preferences](../lib/dashboard/ENDPOINTS.md#notification-preferences-notificationpreferencests) |
| notificationPreferences.ts | `updateNotificationPreferences` | 1 | NotificationPreference | [Notification preferences](../lib/dashboard/ENDPOINTS.md#notification-preferences-notificationpreferencests) |
| overview.ts | `getOverview` | 8 | Lead, Message, Dog, Litter, Media, ActivityEvent, VerificationRequest + profile | [Overview](../lib/dashboard/ENDPOINTS.md#overview-overviewts) |
| reviews.ts | `getReviewSummary` | 6 | Review | [Reviews](../lib/dashboard/ENDPOINTS.md#reviews-reviewsts) |
| reviews.ts | `listReviews` | 6 | Review | [Reviews](../lib/dashboard/ENDPOINTS.md#reviews-reviewsts) |
| reviews.ts | `postReviewReply` | 6 | Review | [Reviews](../lib/dashboard/ENDPOINTS.md#reviews-reviewsts) |
| reviews.ts | `reportReview` | 6 | Review | [Reviews](../lib/dashboard/ENDPOINTS.md#reviews-reviewsts) |
| reviews.ts | `createReviewInvite` | 6 | ReviewInvite | [Reviews](../lib/dashboard/ENDPOINTS.md#reviews-reviewsts) |
| shell.ts | `getNavCounts` | 4 | Lead, Message | [Shell](../lib/dashboard/ENDPOINTS.md#shell-kennelts-shellts) |
| shell.ts | `getNotifications` | 8 | Notification | [Shell](../lib/dashboard/ENDPOINTS.md#shell-kennelts-shellts) |
| verification.ts | `getVerification` | 7 | VerificationRequest, Kennel | [Verification](../lib/dashboard/ENDPOINTS.md#verification-verificationts) |
| verification.ts | `getVerificationStatus` | 7 | VerificationRequest | [Verification](../lib/dashboard/ENDPOINTS.md#verification-verificationts) |
| verification.ts | `submitVerification` | 7 | VerificationRequest, Kennel | [Verification](../lib/dashboard/ENDPOINTS.md#verification-verificationts) |
| verification.ts | `withdrawVerification` | 7 | VerificationRequest | [Verification](../lib/dashboard/ENDPOINTS.md#verification-verificationts) |
| viewerDate.ts | `getViewerTimeZone` | R (reads `getKennelTimeZone`) | Kennel | [Today](../lib/dashboard/ENDPOINTS.md#today) |
| viewerDate.ts | `getViewerToday` | R | Kennel | [Today](../lib/dashboard/ENDPOINTS.md#today) |

New in Phase 0: `lib/dashboard/session.ts` → `requireKennel`.

---

## 6. Security checklist

Run through it before any deploy.

**Session and scoping**

- [ ] Every Server Action calls `requireKennel()` first; `kennelId`/`ownerId` never come from `FormData`, URLs or bound arguments.
- [ ] Every query on kennel-owned data has `kennelId` in its `where` (or goes through a parent that does).
- [ ] Every id in input (dog, litter, lead, conversation, message, media, review, waitlist entry, breed) is checked against the kennel before it's used or written.
- [ ] Sessions issued before `passwordChangedAt` are rejected; sign-out clears `kennel_session`.
- [ ] `JWT_SECRET` is long and random in production (it signs every session).

**Input**

- [ ] No `...body` / `...input` spread into a Prisma `data` object anywhere (`grep -rn "\.\.\.body\|\.\.\.updates" app lib`).
- [ ] Every action parses with a `validation/*` parser and validates before calling a data function.
- [ ] Prisma errors are mapped to translation keys; raw error messages never reach the client.

**Rate limiting** (nothing exists today; decision D8)

- [ ] Login and register (per IP and per email).
- [ ] `checkSlugAction` (slug check) and `lookupAddressAction` (geocoder costs money).
- [ ] `createReviewInvite`, the public review page, the public contact form.
- [ ] `changePassword` attempts.

**Uploads**

- [ ] Only `https://res.cloudinary.com/<your cloud>/` URLs accepted for new images, **including Dog-Edit photos and health documents** (today `validation/dog.ts` accepts any `https://` URL); tighten every prefix check to your cloud name.
- [ ] The unsigned preset is restricted (formats, 10 MB, folder) in the Cloudinary console, or uploads are signed (D10).
- [ ] Replaced and deleted assets are enqueued in `AssetDeletion`.

**Sensitive data**

- [ ] Full CPF/CNPJ never sent to the browser (`getKennelProfile` masks; check `getVerification`, which shows a CNPJ in full by design, and any new public endpoint).
- [ ] Review-invite tokens stored as hashes; the plaintext appears only in the one `createReviewInvite` response.
- [ ] `reportDetails` and verification documents never appear on public pages.
- [ ] No secrets or passwords in logs (see below).

**Old `app/api/*` routes** (read in this session)

| Route | Problem | Recommendation |
| --- | --- | --- |
| `POST /api/dogs` | **Mass assignment:** `data: { lifeStage, ...body, slug, kennelId }`: `slug` and `kennelId` are overridden, but any other column can be set (`id`, `status`, `photoUrls`, `createdAt`, later `archivedAt`/`reservedForLeadId`). Not called by any page | **Remove** |
| `PATCH /api/dogs/[id]` | **Mass assignment:** `data: { ...updates }` (only `slug` stripped): a caller can set `kennelId` and move their dog into **another kennel**, or change `id`. Ownership of the dog itself is checked. Not called | **Remove** |
| `GET`/`DELETE /api/dogs/[id]`, `GET /api/dogs` | Ownership checked; `DELETE` doesn't handle related rows. Not called | **Remove** |
| `POST /api/dogs/[id]/images` | Ownership checked; server-side upload with the API secret, 10 MB limit, no content-type check, appends to `photoUrls`. Not called | **Remove** |
| `PATCH /api/kennel` | Fields are whitelisted (no mass assignment) and scoped by session, but no validation: slug not checked against reserved words or length, no length limits on name/description, breeds matched by name without a 1–3 limit. Used by onboarding (`components/KennelSetupForm.tsx`) | **Patch:** reuse `validation/kennelProfile.ts` (`slugProblem`, limits), or move onboarding to a Server Action |
| `GET /api/search` | Public, unbounded `findMany` over all dogs returning full `Dog` rows. Not called by any page | **Remove** |
| `GET /api/seed-breeds` | **Public `GET` that writes to the database** (`createMany` of breeds, idempotent). Not called | **Remove**; move the list into the seed script |
| `GET /api/kennels` | Public directory pages; validates `page` (1–1000) | Keep |
| `POST /api/auth/login` | Logs the JWT secret bytes (`console.log("secret", secret)`) and the issued token; email compared case-sensitively; no rate limit | **Patch** (your auth work): remove both logs, lower-case the email, rate-limit |
| `POST /api/auth/register` | Logs the plaintext password (`console.log("Request body: ", …, password)`); a 409 returns the existing user's email, name and kennel name (account enumeration); no email-format or password-length check; email not lower-cased | **Patch:** remove the log, return a generic message, validate (reuse `ACCOUNT_LIMITS`), lower-case |
| (missing) sign-out | The sidebar's sign-out is a placeholder (`TODO(auth)` in `Sidebar.tsx`) | **Add** |

Also: `verifyKennelSession()` logs on every call (`✅ Session successfully verified`) and logs full errors on bad tokens. Quiet it before production.

---

## 7. Open product decisions

| # | Decision | Recommendation |
| --- | --- | --- |
| D1 | Outbound email relay (messages, invites, notifications, password reset) | Use a transactional provider (Resend or Postmark) for invites, notifications and password reset first; message delivery (two-way email with reply parsing) later, as its own project. It's a new dependency: decide before Phase 9 |
| D2 | Public review page `/{locale}/review/{token}` | Build it in Phase 6; without it no review can ever be created |
| D3 | Account deletion: immediate vs grace period | 14-day grace period: hide the public page at once, purge with a job, cancel by signing in |
| D4 | Verification approval: admin screen vs manual database edits | Start with a script or SQL runbook (set status, `decidedAt`, `reviewerNote`, `Kennel.isVerified` in one transaction); build an admin screen when requests exceed a few per week |
| D5 | Old-slug redirects | Yes: `KennelSlugHistory` + a 308 in `/kennel/[slug]`; old slugs stay reserved for the kennel |
| D6 | Geocoder for "Look up" | Google Geocoding or Mapbox (good Brazilian coverage), server-side, rate-limited, results rounded to 3 decimals; Nominatim only for low volume (strict usage policy) |
| D7 | Email changes without a relay | Block email changes in production until D1 (show "contact support"), rather than switching unverified addresses |
| D8 | Rate limiting | A small Postgres table (key, window, count) needs no new service; Upstash Redis if you're on Vercel and want less database load |
| D9 | CPF at rest | Personal data under LGPD: encrypt the column (pgcrypto is installed) or at least restrict who can read it; never log it |
| D10 | Signed Cloudinary uploads | Move to signed uploads (a Server Action returns a signature) before launch; the unsigned preset lets anyone with the preset name upload |
| D11 | Lead stage vs puppy status consistency | Keep them independent (a breeder may reserve off-platform), as built; reservations go through `reservePuppy` |
| D12 | Migrations vs `db push` | Baseline and use migrations from Phase 0 (section 2.1); update `CLAUDE.md` |
| D13 | Notification "mark as read" in the bell | Mark all as read when the bell opens (one `updateMany`); needs a small UI change |
| D14 | Dog-Edit public link for archived/mock dogs | Hide "View public page" for archived dogs; after Phase 2 every listed dog is real, so the 404 goes away |
| D15 | `Litter.availableCount` (read by the public kennel page today) | Switch the public page to the computed count (same rule as the dashboard), then drop the column; until then keep it in sync in the litter and dog mutations |
| D16 | Password reset ("forgot password") | Needed before launch; depends on D1 |

---

## 8. Seeding

Today: `prisma/seed.ts` **starts with `deleteMany`** (never run it on shared data; `HANDOFF.md` says so), `scripts/seed-demo-batch-2.ts` is additive and idempotent (skips existing emails/slugs; demo password `Demo1234!`), and `/api/seed-breeds` seeds the `Breed` list over HTTP.

**Plan for `prisma/seed-dev.ts`** (additive, idempotent, keyed by email/slug like batch 2):

1. **Breeds:** move the list from `/api/seed-breeds` into the script (`createMany`, `skipDuplicates`). Remove the route.
2. **Owners and kennels:** reuse batch 2's kennels; give the demo kennel (`ana.kowalski@demo.kennelos.test`, "Lobos do Sul") the mock data below.
3. **From `mock/` fixtures, keep (converted to the demo kennel's breeds, e.g. Siberian Husky, not Labrador/Poodle):**
   - `mock/dogs.ts` → `Dog` + `Media` photo rows (place.dog URLs are fine for dev).
   - `mock/litters.ts` → `Litter` (+ `Dog.litterId`), waitlist entries.
   - `mock/leads.ts` → `Lead`, `LeadEvent`, `LeadNote`, reservations (`Dog.reservedForLeadId`).
   - `mock/conversations.ts` → `Conversation`, `Message` (mix of INBOUND unread and OUTBOUND).
   - `mock/media.ts` → gallery `Media` (drop the 2 fixtures without a URL: `url` is required).
   - `mock/reviews.ts` → `Review` + used `ReviewInvite` rows (store token hashes); then set `ratingAverage`/`reviewCount`.
   - `mock/settings.ts` → one `VerificationRequest` (`NOT_SUBMITTED`), default notification preferences (no rows needed).
4. **Drop:** `accountOverrides`, `kennelProfiles`, `registration` (real columns now), the DEV-ONLY verification states, `navCounts`, `metrics`, `upcoming` (all derived now), and the static `notifications`/`recentActivity` (generate a few `Notification`/`ActivityEvent` rows instead if you want the bell populated).
5. **Relative dates:** fixtures compute dates from "now" (`ago(…)`, `dayFromToday(…)` in `mock/fixtures.ts`, birth and go-home dates, follow-ups, message times). Keep that in the seed so the dashboard always looks current: follow-ups due today and overdue, a litter going home in ~12 days, messages from minutes to days ago. Write date-only values as noon UTC (`@db.Date` for `followUpAt`) and compute "today" in the kennel's `timeZone`.
6. **Fixture ids:** mock ids are readable strings (`dog_marley`, `lead-ricardo-alves`, `ltr_autumn`). Let the database generate UUIDs and look rows up by name/email inside the script; don't hard-code ids.
7. Wire it as the `seed` command in `prisma.config.ts` (`migrations.seed`) only once `prisma/seed.ts` is retired or renamed, so `prisma migrate reset` can't run the destructive one by accident.

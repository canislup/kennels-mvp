# Dashboard data functions

Every dashboard screen reads and writes data through the async functions in `lib/dashboard/*.ts`. This file is the backend to-do list: one entry per function, with its input, its output type (all types live in [`types.ts`](./types.ts)), and what it implies for the Prisma schema.

**How to replace a mock**

1. Rewrite the function body with the real Prisma query. Keep the name, parameters and return type.
2. Return plain serializable data. Dates are ISO strings (`date.toISOString()`), never `Date` objects, because results cross the server/client boundary.
3. Once nothing imports `mock/` any more, delete `lib/dashboard/mock/`.

Pages and components never import from `mock/`, so swapping a body needs no UI changes.

**Conventions**

- `kennelId` is the signed-in owner's kennel, from `getCurrentKennel()`. Scope every query to it; never trust a kennel id coming from the browser.
- *Read* functions are called from Server Components. *Mutations* (from Step 2 on) are Server Actions that call a function here, then `revalidatePath()`.
- Status: **REAL** means it already uses Prisma. **MOCK** means it returns fixtures from `mock/`.

---

## Shell (`kennel.ts`, `shell.ts`)

### `getCurrentKennel(): Promise<CurrentKennel | null>`: REAL, read

- **Input:** none. Reads the session via `verifyKennelSession()`.
- **Output:** `{ id, ownerId, name, slug, city, state, logoUrl, ownerName, ownerInitials }`, or `null` when there's no session or the owner hasn't created a kennel yet. `ownerId` (Step 6a) is what the account-level functions take.
- **Prisma:** `Kennel` (`id`, `ownerId`, `name`, `slug`, `city`, `state`, `logoUrl`) + `Owner.fullName`. No schema change.
- **TEMPORARY mock part (Step 6a):** `ownerName` takes the name saved on Settings → Account from the mock store (`accountOverrides`). Delete those lines once `updateAccount` writes `Owner.fullName`.
- **TEMPORARY mock part (Step 6b):** `name`, `slug`, `city`, `state` and `logoUrl` take the values saved on Settings → Kennel profile (`savedShellOverrides`). Delete those lines once the profile writes reach Prisma.
- **Notes:** `ownerInitials` is derived from the first and last words of `fullName`. Wrapped in React `cache()`, so the layout and page share one query per request.

### `getNavCounts(kennelId): Promise<NavCounts>`: MOCK, read

- **Output:** `{ newLeads: number, unreadMessages: number }`. A badge is hidden when its count is 0. `newLeads` = leads in stage `NEW` (`countNewLeads`); `unreadMessages` = conversations with at least one INBOUND message whose `readAt` is null (`getUnreadSummary` in `messages.ts`).
- **Implies:**
  - **`Lead` model** (`kennelId`, `status` enum with a `NEW` value, `createdAt`). `newLeads` = `count where kennelId and status = NEW`.
  - **`Message` model** (or conversation + message), with a way to know whether the kennel has read it: `readAt DateTime?` on messages sent by buyers. `unreadMessages` = `count of buyer messages where readAt is null`.
- **Mock values:** 7 and 3.

### `getNotifications(kennelId): Promise<DashboardNotification[]>`: MOCK, read

- **Output:** the 5 latest, newest first: `{ id, type, params, createdAt, read }[]`. Stored as data, not text: the bell writes each sentence from `type` + `params` in the viewer's language (`dashboard.shell.notifications.types.*`).

  | type | params |
  | --- | --- |
  | `NEW_LEAD` | `{ name }` |
  | `NEW_MESSAGE` | `{ name, excerpt }` |
  | `NEW_REVIEW` | `{ reviewerName, rating }` |
  | `FOLLOW_UP_DUE` | `{ leadName }` |
  | `VERIFICATION_REMINDER` | `{}` |

- **Implies:** a **`Notification` model**: `id`, `kennelId`, `type` (enum of the values above), `params Json`, `createdAt`, `readAt DateTime?` (`read = readAt != null`). Query: `where kennelId, orderBy createdAt desc, take 5`. Snapshot names into `params` when the notification is created.
- **Not built yet:** marking notifications as read. That will be a mutation in a later step.

## Overview (`overview.ts`)

### `getOverview(kennelId): Promise<Overview>`: MOCK, read

Returns four independent parts. Each can become its own query; `Promise.all` them.

**`setupSteps: SetupStep[]`.** Seven `{ key, done }` items, always in this order, derived from real state (Step 7a; no stored flags). The page computes the percentage, links each unfinished step to where it's done, and hides the card when all are done.

| key | `done` rule |
| --- | --- |
| `kennelDetails` | profile strength has neither `identity` nor `description` missing (name, slug, city, state set; description ≥ 150 characters) |
| `logoAndCover` | `Kennel.logoUrl` and the new `Kennel.coverUrl` are both set |
| `breeds` | the kennel has ≥ 1 `KennelBreed` |
| `firstDog` | the kennel has ≥ 1 non-archived `Dog` |
| `firstLitter` | the kennel has ≥ 1 `Litter` |
| `photos` | the kennel has ≥ 1 `Media` row of type `PHOTO` |
| `verification` | the kennel's `VerificationRequest.status` is `PENDING` or `APPROVED` (Step 6a, derived in `getOverview` from `getVerificationStatus`). Keep `Kennel.isVerified` in sync when a request is approved (it drives the public badge) |

**`metrics: OverviewMetrics`**

| field | Meaning | Source |
| --- | --- | --- |
| `newLeads.count` | leads in stage `NEW` (same as the sidebar badge) | `Lead` (future) |
| `newLeads.sinceYesterday` | of those, created since the start of yesterday in the viewer's time zone | `Lead.createdAt` |
| `unreadMessages.count` | same as `getNavCounts().unreadMessages` | `Message.readAt` (NEW MODEL) |
| `unreadMessages.oldestUnreadAt` | `createdAt` of the oldest unread INBOUND message, or `null` | `Message` |
| `availablePuppies.count` | non-archived dogs with `status = AVAILABLE_PUPPY` (same rule as the Dogs list, so the two screens agree) | `Dog` (exists) |
| `availablePuppies.litterCount` | distinct non-null `litterId`s among those puppies (unlinked puppies don't add a litter) | needs `Dog.litterId` (NEW FIELD) |
| `activeLitters.count` | litters with status `AVAILABLE` or `RESERVED` (`PLANNED` and `SOLD_OUT` don't count) | `Litter` (exists) |
| `activeLitters.nextGoHomeAt` | nearest `expectedGoHomeDate` from today on, among those active litters, or `null` | `Litter` (exists) |

The UI turns these timestamps into "Oldest waiting 2 days" and "Next go-home in 12 days", so return dates rather than pre-computed day counts.

**`recentActivity: ActivityItem[]`.** The 5 latest events, newest first. Each item is `{ id, type, params, createdAt }`. The UI writes the sentence from `type` + `params`, in the viewer's language, so store data, not text.

| type | params | Written when |
| --- | --- | --- |
| `NEW_LEAD` | `{ name, subject }` | a lead is created |
| `NEW_MESSAGE` | `{ name, excerpt }` | a buyer sends a message |
| `NEW_REVIEW` | `{ reviewerName, rating }` (one reviewer name) | a review is posted. Step 6a's mock derives these items from the `Review` rows (one per review, newest first), so the name and rating are always a real review's |
| `DOG_STATUS_CHANGED` | `{ dogName, status: DogStatus }` | a dog's status changes |
| `LITTER_BORN` | `{ damName, puppyCount }` | a litter is marked born |

**Implies** an **`ActivityEvent` model**: `id`, `kennelId`, `type` (enum of the values above), `params Json`, `createdAt`, written by the code paths that cause each event. Query: `where kennelId, orderBy createdAt desc, take 5`. Snapshot names into `params` (don't join live), so the log stays correct after a dog is renamed or deleted.

**`upcoming: UpcomingItem[]`.** The next 4 items, soonest first (`dueAt` ascending), including overdue ones.

| type | params | Source |
| --- | --- | --- |
| `LEAD_FOLLOW_UP` | `{ leadId, leadName }` | `getUpcomingFollowUps(kennelId, 4)`: open leads with `followUpAt` set, earliest first (so overdue ones come first) |
| `LITTER_GO_HOME` | `{ litterId, litterName, puppyCount, reservedCount }` | active litters' `expectedGoHomeDate` from today on; `puppyCount` / `reservedCount` = the litter's computed `totalPuppies` / `reserved` (see Litters) |

Merge both sources in code, sort by `dueAt`, take 4. `dueAt` is the date at noon UTC; the page compares its date part with the viewer's today.


## Dogs (`dogs.ts`)

Used by `/dashboard/dogs` (list), `/dashboard/dogs/new` and `/dashboard/dogs/[id]/edit`.

### Field mapping (Dog-Edit form → Prisma)

| Form field | Type field | Prisma | Notes |
| --- | --- | --- | --- |
| Name | `name` | `Dog.name` | required, ≤ 60 |
| Breed | `breed` | `Dog.breed` | free text in the schema; must be one of the kennel's `KennelBreed` names |
| Sex | `sex` (`MALE`/`FEMALE`) | `Dog.gender` | the column is free text with mixed casing ("Male", "MALE"): normalize on read, write `MALE`/`FEMALE` |
| Life stage | `lifeStage` | `Dog.lifeStage` | |
| Birth date | `birthDate` (YYYY-MM-DD) | `Dog.birthDate` | |
| Status | `status` | `Dog.status` | |
| Litter | `litterId` | **NEW FIELD** `Dog.litterId String?` → `Litter` | puppies only; cleared for adults |
| Registry | `registry` | `Dog.registry` | the club ("CBKC"), not a registration number |
| Registration number | `registrationNumber` | **NEW FIELD** `Dog.registrationNumber String?` | optional, trimmed, ≤ 40, e.g. "BR-204518". Not in the design (added on request) |
| Bloodline | `lineage` | `Dog.lineage` | |
| Pedigree link | `pedigreeUrl` | `Dog.pedigreeUrl` | http(s) only |
| Sire / Dam | `sireName` / `damName` | `Dog.sireName` / `Dog.damName` | plain text |
| Bio | `bio` | `Dog.bio` | ≤ 800 |
| Photos | `photos: string[]` (ordered) | `Media` type `PHOTO` with `dogId` + **NEW FIELD** `Media.position Int` | first = cover. Keep `Dog.photoUrls` dual-written (like `Kennel.primaryBreeds`) until every reader uses `Media` |
| Health documents | `healthDocuments: {id,url,label,fileName}[]` | `Media` with `dogId` + **NEW FIELDS** `Media.category` (enum: `GALLERY` / `HEALTH_DOCUMENT`), `Media.label String?`, `Media.fileName String?` | images only, ≤ 10 |
| (archive) | `archivedAt` | **NEW FIELD** `Dog.archivedAt DateTime?` | soft delete |

### Reads

**`listDogs(kennelId, { status?, archived?, q?, breed?, sex?, stage?, page, pageSize }): Promise<DogListResult>`**: MOCK

- **Output:** `{ items: DogListItem[], total, page, pageSize }`. Items: `{ id, name, breed, sex, lifeStage, birthDate, status, coverPhotoUrl, archived }`, newest first (`createdAt desc`).
- **Rules:** default `where kennelId, archivedAt: null` plus each filter (AND). `archived: true` (the Archived tab) switches to `archivedAt: { not: null }` and ignores `status`. `q` matches `name`, `registry` or `registrationNumber`, case- and **accent-insensitive** ("perola" finds "Pérola"). Prisma's `mode: "insensitive"` handles case only; accents need Postgres `unaccent` (raw query or a generated, unaccented search column).
- `coverPhotoUrl` = the `Media` photo at position 0 (or `photoUrls[0]`).

**`getDogStatusCounts(kennelId): Promise<DogStatusCounts>`**: MOCK

- `{ all, breedingStock, availablePuppy, reserved, sold, archived }`. The first five count non-archived dogs; `archived` counts archived ones (not part of `all`). Ignores the other filters, so tab counts don't jump while searching. One `groupBy status` plus one count.

**`getDogForEdit(kennelId, dogId): Promise<DogForEdit | null>`**: MOCK

- Everything in the mapping table, plus `id`, `slug`, `archivedAt`. Returns `null` when the dog doesn't exist **or belongs to another kennel** (`where: { id, kennelId }`); the page then 404s. Archived dogs are returned (the page shows a notice).

**`getKennelBreeds(kennelId): Promise<{ id, name }[]>`**: MOCK, but can be REAL today: `KennelBreed` → `Breed` already exists. Kept as a mock in this step so the breeds match the mock dogs (Labrador Retriever, Poodle).

**`getLitterOptions(kennelId): Promise<{ id, label, bornAt }[]>`**: MOCK

- The kennel's litters for the puppy litter selector, newest first. `label` is built from stored names, "Dam × Sire · Litter name" (parents via `damId`/`sireId`; missing parents are left out; no translated words in it); the UI appends the formatted birth date or "(planned)". Uses existing `Litter` fields (`name`, `bornAt`, `dam`, `sire`).

### Mutations

All six return `{ ok: true, ... } | { ok: false, fieldErrors, formError? }`, where errors are translation keys (`dashboard.common.errors.*`) plus params. For **every** mutation the real implementation must:

- **(a) check ownership:** the dog must belong to `kennelId` (`where: { id: dogId, kennelId }` or check before writing), otherwise return `formError: { key: "notFound" }`. `kennelId` always comes from the session (`getCurrentKennel()`), never from the form.
- **(b) take explicit typed input only.** The Server Actions in `app/[locale]/dashboard/dogs/actions.ts` parse `FormData` with `parseDogFormData()` (a whitelist of the form's keys) and validate with `validateDogInput()` (`lib/dashboard/validation/dog.ts`) before calling these functions. Never spread raw request input into `prisma.dog.create/update`. The old `/api/dogs` routes do `data: { ...body }`, which lets a client set any column, including `kennelId` (mass assignment). The dashboard no longer calls them.

| Function | Writes | Notes |
| --- | --- | --- |
| `createDog(kennelId, input: DogInput)` → `{ ok, dog: { id, slug } }` | `Dog` (all mapped fields, `kennelId`), `Media` rows for photos (with `position`) and documents | **slug** is generated once from the name (`slugify` + `nextAvailableSlug`, unique per kennel) and **never changes on rename**, so public links don't break |
| `updateDog(kennelId, dogId, input)` | `Dog` mapped fields; replaces the dog's photo/document `Media` rows to match the arrays (delete removed, upsert the rest with new `position`) | `slug` untouched |
| `updateDogStatus(kennelId, dogId, status)` | `Dog.status` | quick menu on the list; status validated against the enum |
| `archiveDog(kennelId, dogId)` | `Dog.archivedAt = now()` only | hidden from the list, counts and public site. Must **not** change `status`, so restore can bring the dog back as it was |
| `restoreDog(kennelId, dogId)` | `Dog.archivedAt = null` | the dog returns with the status it had. Ownership check as above. Called by `restoreDogAction(dogId, from)`, a plain form action that redirects with `?notice=restored` |
| `deleteDog(kennelId, dogId)` | deletes `Dog`; its `Media` cascade (`onDelete: Cascade` exists); also clear `Litter.damId`/`sireId` that point at it (no cascade there) | permanent |

**Prefill (no new function):** `/dashboard/dogs/new?litterId=<id>` loads that litter with `getLitterDetail(kennelId, litterId)`; if it returns `null` (not this kennel's) the parameter is ignored. On create, a hidden `returnTo=litter` sends the user back to `/dashboard/litters?litter=<litterId>&notice=puppyAdded`; the target id is the *validated* `litterId`, so it can only be one of the kennel's litters.

## Litters (`litters.ts`)

Used by `/dashboard/litters` (master-detail), `/dashboard/litters/new` and `/dashboard/litters/[id]/edit`.

### Field mapping (litter form → Prisma)

| Form field | Type field | Prisma | Notes |
| --- | --- | --- | --- |
| Name | `name` | `Litter.name` (exists, `String?`) | required in the form, ≤ 60. Consider making the column required |
| Breed | `breed` | `Litter.breed` | free text; must be one of the kennel's `KennelBreed` names |
| Status | `status` | `Litter.status` (`LitterStatus`) | |
| Dam / Sire | `damId` / `sireId` | `Litter.damId` / `Litter.sireId` (exist) | optional; adult of the right sex, same breed, same kennel, not archived |
| Birth date | `birthDate` (YYYY-MM-DD) | `Litter.bornAt` (exists) | required for every status except `PLANNED`; not in the future |
| Expected go-home date | `expectedGoHomeDate` (YYYY-MM-DD) | `Litter.expectedGoHomeDate` | not before the birth date |
| Number of puppies | `puppyCount` | `Litter.puppyCount` | integer 0–20, 0 = not set |
| (waitlist) | `WaitlistEntry[]` | **NEW MODEL** `WaitlistEntry { id, litterId, leadId, position Int, note String?, createdAt }` | read-only in Step 3; `name` comes from `Lead` |

`Litter.name` and `Litter.bornAt` already exist (added for the public kennel profile), so they are **not** new fields. `Litter.availableCount` also exists, but the dashboard computes availability from linked puppies (below) and ignores it; drop it or keep it in sync. Dates are date-only strings on purpose (no time-zone drift); store them as `@db.Date` or noon UTC.

### Computed numbers (never stored)

For a litter, with *linked puppies* = dogs whose `litterId` is this litter and `archivedAt` is null:

| Value | Rule |
| --- | --- |
| `totalPuppies` | `max(puppyCount, linked puppies)` |
| `available` | linked puppies with status `AVAILABLE_PUPPY` |
| `reserved` | linked puppies with status `RESERVED` |
| `onWaitlist` | `WaitlistEntry` rows for the litter |
| `placedShare` | `(totalPuppies − available) ÷ totalPuppies`, `0` when `totalPuppies` is 0 (progress bar) |

One way to do it: `prisma.litter.findMany({ include: { _count: { select: { waitlist: true } }, puppies: { where: { archivedAt: null }, select: { status: true } } } })` and reduce in code, or a `groupBy` on `Dog` by `litterId, status`.

### Reads

| Function | Output | Notes |
| --- | --- | --- |
| `listLitters(kennelId, { status? })` | `LitterListItem[]`: `{ id, name, breed, status, damName, sireName, birthDate, expectedGoHomeDate, stats }` | newest first (`createdAt desc`) |
| `getLitterStatusCounts(kennelId)` | `{ all, planned, available, reserved, soldOut }` | ignores the status filter; one `groupBy status` |
| `getLitterDetail(kennelId, litterId)` | list item + `puppyCount`, `dam`/`sire` (`{ id, name, breed, ageLabelParts, coverPhotoUrl } \| null`), `puppies` (`{ id, name, sex, status, coverPhotoUrl }[]`, by name) | `null` if not found **or another kennel's**. `ageLabelParts` = `{ unit: weeks\|months\|years, count }` from `Dog.birthDate`; the UI translates it |
| `getLitterWaitlist(kennelId, litterId)` | `{ id, position, leadId, name, note, createdAt }[]` by `position` | needs `WaitlistEntry` + `Lead` |
| `getLitterForEdit(kennelId, litterId)` | `{ id, name, breed, status, damId, sireId, birthDate, expectedGoHomeDate, puppyCount }` or `null` | ownership as above |
| `getLitterFormOptions(kennelId, litterId?)` | `{ breeds, females, males }`, parents as `{ id, name, breed, archived }` | adults (`lifeStage = ADULT`), non-archived, this kennel; the form filters them by the chosen breed. With `litterId` (edit), the litter's current dam and sire are **always** included, `archived: true` if they are, so saving doesn't clear them. Validation accepts an archived parent only if it's that litter's unchanged current parent. |
| `getLinkablePuppies(kennelId, litterId)` | `{ id, name, sex, status, coverPhotoUrl }[]` | this kennel's puppies of the litter's breed with `litterId = null`, not archived |

**Fixture lead ids** (Step 4 should reuse them): the Autumn litter's waitlist points at `lead-ricardo-alves`, `lead-marina-costa` and `lead-camila-torres`.

### Mutations

All return `{ ok: true, ... } | { ok: false, fieldErrors, formError? }` with translation-key errors. For each one the real implementation must:

- **check ownership of everything it touches:** the litter belongs to `kennelId`, and so does every dog it references (dam, sire, linked puppy). Return `formError: { key: "notFound" }` otherwise. `kennelId` comes from the session only. A `.bind`-ed id is not tamper-proof (Next.js encrypts closures, not bound arguments), so these checks are what make it safe.
- **take explicit typed input:** the Server Actions (`app/[locale]/dashboard/litters/actions.ts`) build a `LitterInput` with `parseLitterFormData()` (whitelist) and `validateLitterInput()` (`lib/dashboard/validation/litter.ts`). Never spread raw input into Prisma.

| Function | Writes | Notes |
| --- | --- | --- |
| `createLitter(kennelId, input)` → `{ ok, litter: { id } }` | `Litter` (mapped fields, `kennelId`) | |
| `updateLitter(kennelId, litterId, input)` | `Litter` mapped fields | validation refuses a breed change while puppies are linked (`breedHasPuppies`) |
| `updateLitterStatus(kennelId, litterId, status)` | `Litter.status` only | **independent of dog statuses:** changing a litter to Sold out does not mark its puppies Sold, and vice versa |
| `deleteLitter(kennelId, litterId)` | deletes the `Litter` and its `WaitlistEntry` rows; sets `Dog.litterId = null` on its puppies | **puppies are never deleted.** Declare `Dog.litter Litter? @relation(fields: [litterId], references: [id], onDelete: SetNull)`. The schema currently has no cascade rules on `Litter`/`Dog` relations (known gap: deletes fail on foreign keys), so add `onDelete: SetNull` here and `onDelete: Cascade` on `WaitlistEntry.litter` |
| `linkPuppyToLitter(kennelId, litterId, dogId)` | `Dog.litterId = litterId` | the dog must be this kennel's, a puppy, not archived, same breed, and not already in a litter (`puppyNotLinkable` otherwise). There is no unlink function: unlinking is done in Dog-Edit's litter selector (`updateDog`) |

## Leads (`leads.ts`)

Used by `/dashboard/leads` (board and list), `/dashboard/leads/new`, the lead page (stub in 4a, full in 4b), Overview and the sidebar badge.

### New models and enums

```prisma
enum LeadStage { NEW CONTACTED INTERESTED FOLLOW_UP RESERVED SOLD LOST }
enum LostReason { NO_RESPONSE BOUGHT_ELSEWHERE CHANGED_MIND TOO_FAR OTHER }
enum LeadSource { PUBLIC_FORM DIRECTORY REFERRAL OTHER }
enum PreferredContact { EMAIL PHONE WHATSAPP }

model Lead {
  id               String           @id @default(uuid())
  kennelId         String
  name             String
  email            String?          // stored lower-cased
  phone            String?
  preferredContact PreferredContact
  city             String?
  state            String?
  source           LeadSource
  stage            LeadStage        @default(NEW)
  interestBreed    String
  interestNote     String?
  litterId         String?          // → Litter, onDelete: SetNull
  dogId            String?          // → Dog, onDelete: SetNull
  followUpAt       DateTime?        @db.Date   // a calendar day: no time, no zone shift
  firstMessage     String?
  lostReason       LostReason?      // set only while stage = LOST
  createdAt        DateTime         @default(now())
  lastActivityAt   DateTime         @default(now())
  @@unique([kennelId, email])       // one lead per email per kennel (email lower-cased on write)
  @@index([kennelId, stage, lastActivityAt])
}

model LeadEvent {
  id        String        @id @default(uuid())
  leadId    String        // → Lead, onDelete: Cascade
  type      LeadEventType // see the table below
  params    Json          // never pre-rendered text, the UI translates
  createdAt DateTime      @default(now())
}

model LeadNote {
  id        String   @id @default(uuid())
  leadId    String   // → Lead, onDelete: Cascade
  body      String   // 1–2000 characters
  createdAt DateTime @default(now())
}

model Conversation {
  id            String   @id @default(uuid())
  leadId        String   @unique // one per lead; → Lead, onDelete: Cascade
  lastMessageAt DateTime
}

model Message {
  id             String           @id @default(uuid())
  conversationId String           // → Conversation, onDelete: Cascade
  direction      MessageDirection // INBOUND (buyer) | OUTBOUND (kennel)
  body           String           // may be "" when sharedDogId is set (a dog-only message)
  sharedDogId    String?          // NEW FIELD (Step 5): a dog card in the message; → Dog, onDelete: SetNull
  createdAt      DateTime         @default(now())
  readAt         DateTime?        // null = not read by the kennel (INBOUND only)
  @@index([conversationId, createdAt])
}

// On Dog (NEW FIELD): which lead the puppy is reserved for.
//   reservedForLeadId String? @unique  // → Lead, onDelete: SetNull
```

| `LeadEvent.type` | params | Written by |
| --- | --- | --- |
| `CREATED` | `{ source }` | createLead, the public contact form |
| `STAGE_CHANGED` | `{ from, to, auto? }` | moveLeadStage; sendMessage with `auto: true` (New → Contacted on the first reply) |
| `FOLLOW_UP_SET` | `{ date }` | createLead/updateLead (new date), setFollowUp |
| `FOLLOW_UP_DONE` | `{ date }` | markFollowUpDone |
| `MARKED_LOST` | `{ from, reason }` | markLeadLost (`from` is what reopenLead restores) |
| `REOPENED` | `{ to }` | reopenLead |
| `PUPPY_RESERVED` / `PUPPY_RELEASED` | `{ dogId, dogName }` | reservePuppy / releasePuppy, markLeadLost with release |
| `WAITLIST_ADDED` / `WAITLIST_REMOVED` | `{ litterId, litterName }` | addToWaitlist / removeFromWaitlist |

Names are snapshotted into `params`, so the history stays right after a dog or litter is renamed or deleted.

- `hasUnread` is not a column: it's derived from the lead's conversation (an INBOUND message with `readAt` null). The board and list compute it per card (one `exists` subquery, or a `groupBy` on unread messages by conversation).
- **The timeline is a union** of `LeadEvent`, `LeadNote` and `Message` rows for the lead, merged and sorted by `createdAt` desc. Events never duplicate notes or messages (there are no NOTE/MESSAGE event types). Three queries + a merge in code, or a SQL `UNION ALL`.
- **Lost leads** (`stage = LOST`) are never a board column. The board, the follow-up banner, `getFollowUpSummary`, `getUpcomingFollowUps` and the Overview "New leads" count all exclude them; the list view excludes them unless filtered with `stage = LOST`.
- Postgres treats `NULL` emails as distinct, so leads without an email never collide on the unique constraint.

### "Today"

`followUpAt` is a calendar day. "Due" means `followUpAt <= today`. Compare date-only values with date-only values only (in SQL: `"followUpAt" <= $today::date`), never with `now()` in UTC.

- **Real backend: today comes from a new `Kennel.timeZone` field** (NEW FIELD, an IANA name such as `America/Sao_Paulo` or `America/Denver`, set during kennel setup). Compute it on the server as `today = (now() AT TIME ZONE kennel.timeZone)::date`. Background work such as follow-up reminders and digest emails has no browser, so it can't depend on a cookie.
- `getViewerToday()` / `getViewerTimeZone()` (`lib/dashboard/viewerDate.ts`, Step 7a) already use the kennel's zone from `getKennelTimeZone(kennelId)` (Settings → Kennel profile), falling back to the `kennelos_tz` cookie the Overview greeting saves, then `America/Sao_Paulo`. **The server must do the same:** every "today", "overdue" and date-only comparison (follow-ups, go-home dates, reminders, digests) uses `Kennel.timeZone`, never the server's zone or a UTC date.

### Reads

| Function | Output | Rules |
| --- | --- | --- |
| `listLeadsBoard(kennelId, filters)` | `{ columns: { stage, count, cards, truncated }[] }`, all six stages in order | cards by `lastActivityAt desc`; counts follow the filters. **Sold** shows only leads with `lastActivityAt` in the last 90 days; `truncated` = older sold leads exist (they're in the list view). No manual ordering inside a column. |
| `listLeadsTable(kennelId, filters, { page, pageSize })` | `{ items, total, page, pageSize }` | `lastActivityAt desc`, no 90-day limit. Without `filters.stage`: every stage except `LOST`; with a stage: only that stage (`LOST` included, with `lostReason` per row) |
| `getFollowUpSummary(kennelId)` | `{ dueCount, names }` | open leads (not Reserved or Sold) with `followUpAt <= today`, earliest first |
| `getLeadSummary(kennelId, leadId)` | `Lead \| null` | `null` if missing **or another kennel's** (the page 404s) |
| `getLeadFormOptions(kennelId)` | `{ breeds, litters: { id, name, breed }[], dogs: { id, name, breed }[] }` | dogs exclude archived ones |
| `getUpcomingFollowUps(kennelId, limit)` | `{ leadId, name, followUpAt }[]` | open leads with a follow-up, earliest first (overdue first) |
| `countNewLeads(kennelId)` | `{ count, sinceYesterday }` | stage `NEW`; `sinceYesterday` counts those created since the start of the kennel's yesterday |
| `getLeadDetail(kennelId, leadId, { history? })` | `LeadDetail \| null` | the lead plus `litter { id, name }`, `dog { id, name, status }`, `reservation { dogId, dogName }` (the puppy held for them: `Dog.reservedForLeadId = leadId` and status `RESERVED`), `hasUnread`, `timeline` (newest first, 30 items unless `history: "all"`), `timelineHasMore`, `recentMessages` (last 3, oldest first), `conversationId`, `waitlists { entryId, litterId, litterName, position }[]`. `null` if missing or another kennel's |
| `getWaitlistOptions(kennelId, leadId)` | `{ id, name, breed, status }[]` | the kennel's litters with status `PLANNED`, `AVAILABLE` or `RESERVED` that this lead is not on yet |
| `getReservablePuppies(kennelId, leadId)` | `{ id, name, sex, breed, litterName, coverPhotoUrl }[]` | non-archived dogs with status `AVAILABLE_PUPPY`; the lead's `interestBreed` first, then by name |

`LeadCard` (board card / list row) = `{ id, name, stage, source, interestBreed, interestNote, litterName, dogName, followUpAt, lastActivityAt, hasUnread }`; litter and dog names come from the linked rows.

**Filters** `{ q?, breed?, source?, followUp? }`: `breed` = `interestBreed`; `followUp`: `due` (`followUpAt <= today`), `set` (has a date), `none` (no date). `q` matches name, email, interest note, and the linked dog's or litter's name, case- and **accent-insensitive** (Postgres `unaccent`, as for dogs).

### Mutations

Both return `{ ok: true, ... } | { ok: false, fieldErrors, formError? }`. Each must **check ownership** (the lead, and any litter or dog it references, belong to `kennelId` from the session) and take **explicit typed input** (`parseLeadFormData()` whitelist + `validateLeadInput()` in `lib/dashboard/validation/lead.ts`; the stage is checked against the enum).

| Function | Writes | Notes |
| --- | --- | --- |
| `createLead(kennelId, input: LeadInput)` → `{ ok, lead: { id } }` | `Lead`; `LeadEvent` `CREATED` (`{ source }`) and, if a follow-up was set, `FOLLOW_UP_SET` (`{ date }`) | **Duplicate email:** if the kennel already has a lead with this email (case-insensitive), return `fieldErrors.email = duplicateLeadEmail` and `formError = { key: "duplicateLead", params: { leadId, name } }`; the form links to that lead. Real equivalent: the `@@unique([kennelId, email])` constraint (email lower-cased on write), catching Prisma's `P2002` and looking the existing lead up for the link. |
| `moveLeadStage(kennelId, leadId, stage)` | `Lead.stage`, `lastActivityAt`; `STAGE_CHANGED` | the six pipeline stages only (never `LOST`; refused for a lost lead). Used by the board and the lead page's Change stage. Moving to Reserved or Sold here **only changes the stage** (a breeder may reserve or sell off-platform): dog status and lead stage can disagree. Decide whether the real backend should enforce consistency (see the report). |
| `updateLead(kennelId, leadId, input)` | the editable `Lead` fields (not `stage`, `lostReason`, `firstMessage`); `FOLLOW_UP_SET` when the date changes | duplicate-email check excludes the lead itself. A saved follow-up that is now in the past may be kept unchanged; a new one may not be in the past. |
| `addLeadNote(kennelId, leadId, body)` | `LeadNote` (1–2000 characters, trimmed) | no event: the note itself is in the timeline |
| `setFollowUp(kennelId, leadId, date \| null)` | `Lead.followUpAt`; `FOLLOW_UP_SET` | Reschedule / Set follow-up. Date-only; the action refuses dates before the kennel's today. **Refused for a lost lead** (`formError: followUpLeadLost`); the lead page hides Set/Reschedule while the lead is lost |
| `markFollowUpDone(kennelId, leadId)` | `followUpAt = null`; `FOLLOW_UP_DONE` (`{ date }`) | |
| `markLeadLost(kennelId, leadId, { reason, releasePuppy })` | `stage = LOST`, `lostReason`, `followUpAt = null`; `MARKED_LOST`; when `releasePuppy` and the lead holds a puppy: the release below and `PUPPY_RELEASED` | one transaction |
| `reopenLead(kennelId, leadId)` | `stage` = the latest `MARKED_LOST` event's `from`, `lostReason = null`; `REOPENED` | does **not** restore the follow-up or a released puppy. **If `from` is `RESERVED` but the lead no longer holds a puppy** (`Dog.reservedForLeadId`), reopen to `INTERESTED` instead (Step 5) |
| `reservePuppy(kennelId, leadId, dogId)` | `Dog.status = RESERVED`, `Dog.reservedForLeadId = leadId`, `Lead.dogId = dogId`, `Lead.stage = RESERVED`; `PUPPY_RESERVED` | **one transaction with a guarded update**: `UPDATE "Dog" SET status='RESERVED', "reservedForLeadId"=$lead WHERE id=$dog AND "kennelId"=$kennel AND status='AVAILABLE_PUPPY' AND "archivedAt" IS NULL`; if 0 rows changed, return `formError: puppyJustReserved` (someone else got it). Refused if the lead already holds a puppy. |
| `releasePuppy(kennelId, leadId)` | `Dog.status = AVAILABLE_PUPPY`, `reservedForLeadId = null`, `Lead.dogId = null`, `Lead.stage = INTERESTED` (stays `LOST` when called from markLeadLost); `PUPPY_RELEASED` | |
| `addToWaitlist(kennelId, leadId, litterId, note?)` | `WaitlistEntry` at `position = max + 1` for that litter; `WAITLIST_ADDED` | once per lead per litter: `@@unique([litterId, leadId])`; compute the position inside the transaction |
| `removeFromWaitlist(kennelId, entryId)` | deletes the entry; later entries of that litter `position - 1`; `WAITLIST_REMOVED` | ownership: the entry's litter belongs to `kennelId` |
| `deleteLead(kennelId, leadId)` | see below | **refused** with `formError: releasePuppyFirst` while the lead holds a reserved puppy |

**Deleting a lead** deletes, in one transaction: its `LeadNote`s, `LeadEvent`s, its `Conversation` and all its `Message`s, and its `WaitlistEntry`s (later entries in each litter move up one position), then the `Lead`. With the relations above (`onDelete: Cascade` on notes, events, conversation, messages and waitlist entries) one `delete` does it, except the waitlist re-numbering, which needs an explicit update. `Dog.reservedForLeadId` is `SetNull`, but the delete is refused while a puppy is held, so that path is never used. Activity items on Overview keep their snapshotted names.

**Messages.** The lead page links "Send message" to `/dashboard/messages?lead=<id>` (see the Messages section). The lead page only reads the last 3 messages and never marks them read.

**Public-form leads** (`source = PUBLIC_FORM`) are created by the public site's contact form (your backend task). That request should create, in one transaction, the `Lead` (with `firstMessage`), a `Conversation` and its first `Message` (both models arrive in Step 5), plus the `CREATED` event. If the email already exists for the kennel, attach the message to the existing lead instead of failing.

**Fixture lead ids:** `lead-ricardo-alves`, `lead-marina-costa`, `lead-camila-torres` (used by the Autumn litter waitlist) plus `lead-<first>-<last>` for everyone else in `mock/leads.ts`.

---

## Messages (`messages.ts`)

The inbox: one `Conversation` per lead (models in the Leads section), messages oldest first. **Inbox only: an OUTBOUND message is stored, not delivered.** There's no email/SMS/WhatsApp relay in this version, so the buyer never receives the kennel's reply; the UI doesn't claim it was "sent to" anyone. Delivery (and receiving buyer replies as INBOUND rows) is a separate backend decision.

**Ownership:** every function scopes by `kennelId` through the lead (`Conversation → Lead.kennelId`). A conversation or lead of another kennel is `notFound` (mutations) or `null` (reads). Ids come from `.bind` on the server, which is not encrypted, so this check is the real protection.

### Reads

| Function | Output | Rules |
| --- | --- | --- |
| `listConversations(kennelId, { q?, unreadOnly? })` | `ConversationListItem[]`: `{ id, leadId, leadName, initials, lastMessagePreview, lastMessageAt, unreadCount }` | newest `lastMessageAt` first. `q` matches the lead's name **or any message body**, case- and accent-insensitive (`unaccent`, as for Dogs). `unreadOnly`: conversations with ≥ 1 unread INBOUND message. `lastMessagePreview` is `{ kind: "text", text, direction }`, `{ kind: "dog", dogName, direction }` (a dog-only message) or `{ kind: "none" }` (empty conversation). `unreadCount` = INBOUND rows with `readAt` null (a `groupBy` by conversation) |
| `getConversationThread(kennelId, conversationId)` | `ConversationThread \| null`: `{ conversation, lead, messages }` | `lead` = `{ id, name, stage, interestBreed, interestNote, litterName, dog { id, name, litterName }, followUpAt, email, phone }` for the side panel. `messages`: all, oldest first, each with `sharedDog { id, name, breed, sex, ageParts, coverPhotoUrl } \| null` (archived dogs still resolve: it's history; a deleted dog → `null` via `SetNull`). Paginate later if threads get long |
| `getConversationForLead(kennelId, leadId)` | `{ conversationId } \| null` | the `?lead=` redirect |
| `getShareableDogs(kennelId)` | `ShareableDog[]`: `{ id, name, breed, sex, status, coverPhotoUrl }` | non-archived dogs, `AVAILABLE_PUPPY` first, then by name |
| `getUnreadSummary(kennelId)` | `{ unreadConversations, oldestUnreadAt }` | conversations with ≥ 1 unread INBOUND message (sidebar badge, Overview card), and the oldest unread message's `createdAt` (or `null`) |

### Mutations

| Function | Writes | Notes |
| --- | --- | --- |
| `sendMessage(kennelId, conversationId, { body, sharedDogId? })` | `Message` (OUTBOUND, `readAt = createdAt`), `Conversation.lastMessageAt`, `Lead.lastActivityAt`; **if the lead is `NEW`: `stage = CONTACTED` + `STAGE_CHANGED { from: NEW, to: CONTACTED, auto: true }`** | one transaction. `body` trimmed, ≤ 2000; required unless `sharedDogId` is set (`messageRequired`). `sharedDogId` must be this kennel's, non-archived (`invalidChoice`). "Share a dog" sends `{ body: "", sharedDogId }`. **Not delivered** (see above). The automatic move only happens from `NEW` (never moves a lead backwards or out of `LOST`) |
| `markConversationRead(kennelId, conversationId)` | `readAt = now()` on its unread INBOUND messages | idempotent. Called by the client once an **opened** thread (`?conversation=`) is on screen, never during render and never for the desktop default thread |
| `startConversation(kennelId, leadId)` → `{ ok, conversationId }` | `Conversation` (`lastMessageAt = now()`) if the lead has none | idempotent (one per lead: `leadId @unique`; catch `P2002` and return the existing one). The empty conversation shows in the list with "No messages yet" |

---

## Media (`media.ts`)

The kennel gallery on the public page: photos (uploaded to Cloudinary) and video **links** (YouTube or Vimeo; no video upload). Maps to the existing `Media` model (`type` `PHOTO`/`VIDEO`, `url`, `kennelId`, `breedId`, `dogId`).

| Type field | Prisma | Notes |
| --- | --- | --- |
| `type` | `Media.type` | |
| `url` | `Media.url` | photos: the Cloudinary `secure_url` (the action accepts only `https://res.cloudinary.com/…`); videos: the pasted link |
| `caption` | **NEW FIELD** `Media.caption String?` | photo caption or video title, ≤ 120 |
| `breed` | `Media.breedId` → `Breed.name` | must be one of the kennel's breeds (`KennelBreed`); `null` = all breeds |
| `dogId` / `dogName` | `Media.dogId` → `Dog.name` | must be this kennel's, non-archived; its breed must match `breed` when both are set (`dogBreedMismatch`); `null` = whole kennel |
| `position` | **NEW FIELD** `Media.position Int` (also needed by Dog-Edit) | gallery order, 0-based, **global within a type** (not per page). Keep it contiguous: renumber after deletes and moves |
| `provider` | **NEW FIELD** `Media.provider` enum `VideoProvider` (`YOUTUBE` \| `VIMEO`), null for photos | derived from the URL by `videoProviderOf()` (`lib/dashboard/validation/media.ts`) |
| `thumbnailUrl` | **NEW FIELD** `Media.thumbnailUrl String?` | videos only; `null` for now (the card shows a placeholder). Later: YouTube `img.youtube.com/vi/<id>/hqdefault.jpg`, Vimeo oEmbed |
| (upload size) | optional: `width Int?`, `height Int?` | the widget reports them (`PhotoUpload`); store them if the public page wants aspect ratios |

### Reads

| Function | Output | Rules |
| --- | --- | --- |
| `listMedia(kennelId, { type, breed?, dogId?, page, pageSize })` | `{ items: MediaItem[], total, page, pageSize }` | `where kennelId, type` + filters, `orderBy position`. Photos: 24 per page; videos: one page |
| `getMediaCounts(kennelId)` | `{ photos, videos }` | tab counts (unfiltered) |
| `getMediaFilterOptions(kennelId)` | `{ breeds, dogs: { id, name, breed }[] }` | the kennel's breeds, its non-archived dogs |

### Mutations

| Function | Writes | Notes |
| --- | --- | --- |
| `addPhotos(kennelId, uploads)` | one `Media` (`PHOTO`, untagged) per upload, appended at `position = max + 1, …` | called once after the widget's queue finishes (≤ 20 per batch). Compute positions in the transaction |
| `addVideoLink(kennelId, { url, provider, title, breed, dogId })` | `Media` (`VIDEO`) at the end | only YouTube (`watch?v=`, `youtu.be/`, `shorts/`) and Vimeo (`vimeo.com/<digits>`) URLs (`invalidVideoUrl`) |
| `updateMedia(kennelId, id, { caption, breed, dogId })` | `Media.caption`, `breedId`, `dogId` | Edit details (photos and videos) |
| `tagMedia(kennelId, ids, { breed, dogId })` | `breedId`, `dogId` on each | bulk, **≤ 100 ids** (`tooManySelected`); `updateMany where { id in ids, kennelId }` ignores other kennels' ids |
| `deleteMedia(kennelId, ids)` | deletes the rows; renumbers `position` | bulk, ≤ 100 ids. **Also delete the Cloudinary asset** of each deleted photo, server-side with the API secret (`cloudinary.uploader.destroy(publicId)` or Admin API `delete_resources`); keep the `public_id` (new field `Media.publicId String?`, or parse it from the URL). Delete the rows first, then the assets (a failed asset delete leaves an orphan file, not a broken page); log failures. Video links have no asset |
| `moveMedia(kennelId, id, toIndex)` | `position` of the item and the ones it passes | `toIndex` is the global position (0 = first). One transaction: shift the range between old and new position by ±1 |

**Recommendation: one `Media` table for the gallery and dog photos.** Dog-Edit photos are already planned as `Media` rows with `dogId` (Dogs section). Keep a single table: a photo tagged with a dog is that dog's photo *and* in the gallery; the dog page lists `where dogId` ordered by the same `position`, and health documents stay out via `Media.category = HEALTH_DOCUMENT`. Reordering in Dog-Edit then permutes positions only among that dog's rows. Dog-Edit is **not** changed in this step (it still reads and writes `dog.photos`).

**Fixtures:** 30 photos (`media_photo_1…30`; 2 have no URL to show the placeholder) and 3 video links (two YouTube, one Vimeo; `thumbnailUrl: null`) in `mock/media.ts`.

---

## Reviews (`reviews.ts`)

Reviews of the kennel, the kennel's public reply, reports and invites. **Only invited people can review** (the anti-fake-review rule): a review can only be created through a valid, unused `ReviewInvite`.

```prisma
model Review {                    // NEW MODEL
  id            String   @id @default(uuid())
  kennelId      String   // → Kennel, onDelete: Cascade
  inviteId      String?  @unique // → ReviewInvite (the invite it came from; null only for imported reviews, if ever)
  reviewerName  String
  purchaseLabel String?  // e.g. "Bought Café, Labrador", snapshotted when the review is created
  verified      Boolean  // the reviewer came from this kennel's invite ("Verified buyer")
  rating        Int      // 1 to 5 (check constraint)
  body          String
  createdAt     DateTime @default(now())
  replyBody      String?  // the kennel's one public reply, 1–1000 (or a ReviewReply model)
  replyCreatedAt DateTime?
  replyUpdatedAt DateTime?
  reportedAt    DateTime?
  reportReason  ReviewReportReason? // INAPPROPRIATE | NOT_A_BUYER | SPAM | OTHER
  reportDetails String?  // ≤ 500, for moderators, never public
  @@index([kennelId, createdAt])
}

model ReviewInvite {              // NEW MODEL
  id          String    @id @default(uuid())
  kennelId    String    // → Kennel, onDelete: Cascade
  email       String?
  token       String    @unique // random, ≥ 128 bits (store a hash if you prefer)
  createdAt   DateTime  @default(now())
  usedAt      DateTime?
  emailSentAt DateTime? // always null in this version: no email sending
}
```

| Function | Output / writes | Notes |
| --- | --- | --- |
| `getReviewSummary(kennelId)` | `{ average, total, distribution: { stars, count, percent }[], needsReply, replied, reported }` | `average` one decimal (0 with no reviews); distribution 5 → 1; `percent` of the total, rounded. **Recommendation:** keep `Kennel.ratingAverage Float` and `Kennel.reviewCount Int` as stored aggregates, updated in the transaction that creates a review (the directory and public cards need them on every list query) |
| `listReviews(kennelId, { status, page, pageSize = 10 })` | `{ items: Review[], total, page, pageSize }` | newest first. `status`: `all`; `needs-reply` = no reply; `replied` = has a reply; `reported` = `reportedAt` set |
| `postReviewReply(kennelId, reviewId, body)` | reply body + `replyCreatedAt` (first time) / `replyUpdatedAt` | **creates or edits** the public reply (edit is an addition beyond the design, so a public typo can be fixed). 1–1000 characters, trimmed. No delete |
| `reportReview(kennelId, reviewId, { reason, details? })` | `reportedAt`, `reportReason`, `reportDetails` | reporting twice → `formError: alreadyReported`. The review **stays public** until moderation (moderation tools are out of scope); the UI shows "Reported, under review" and hides the report button |
| `createReviewInvite(kennelId, { email?, locale })` → `{ ok, inviteId, url, emailSent: false }` | `ReviewInvite` with a random token | optional, well-formed email. **No email is sent in this version: `emailSent` is always false** and the UI says so. `url` is `/{locale}/review/{token}` (the UI makes it absolute with the site's origin; the real version should use a configured site URL). **That public page doesn't exist yet**: it's a backend + public-site task. It must check the token (exists, unused, this kennel), take the rating and text, create the `Review` with `verified = true` and `inviteId`, set `usedAt`, and update the kennel's stored aggregates, all in one transaction |

**Ownership:** every mutation checks the review belongs to `kennelId` (`where: { id: reviewId, kennelId }`), else `formError: notFound`. The review id is bound on the server (`.bind`), which is not tamper-proof.

**Fixtures:** 14 reviews (nine 5★, three 4★, one 3★, one 2★; average 4.4): the design's four (Pedro Lima, Fernando Dias, Isabela Rocha, Paulo Lima) plus ten more; three without a reply, one reported (Thiago Nunes). Reviewers who are leads use the lead's name. Two invites.

---

## Account (`account.ts`)

`ownerId` is `CurrentKennel.ownerId` (the session user), never a value from the browser. **Partly real today:** `getAccount` starts from the real `Owner` row and the duplicate-email check reads real owners; saved changes live in the mock store (`accountOverrides`) and nothing is written to the database. `getCurrentKennel()` applies the saved name (temporary, see Shell).

| Function | Output / writes | Notes |
| --- | --- | --- |
| `getAccount(ownerId)` | `{ fullName, email, locale \| null }` | `Owner.fullName`, `Owner.email`, **NEW FIELD** `Owner.locale String?` (`en` \| `pt-BR`; null = never chosen). The language select shows the language on screen |
| `updateAccount(ownerId, { fullName, email, locale })` | `Owner.fullName`, `email`, `locale` | name 1–80; well-formed email (stored lower-case); `locale` `en` or `pt-BR`; **an email used by another owner** → `fieldErrors.email = emailTaken` (case-insensitive). **The real backend must verify a new email address** before switching to it (send a link to the new address; keep the old one until confirmed). After a changed language the action sets the `NEXT_LOCALE` cookie and redirects to the same page in the new locale with `?notice=saved`. Consider making the EN \| PT switcher also save `Owner.locale` when signed in |
| `changePassword(ownerId, { currentPassword, newPassword, confirmPassword })` | nothing in the mock | the mock **can't check the real password**: it only requires a non-empty current password; new ≥ 8 characters (≤ 200), different from the current one, equal to the confirmation. **Real version needs:** `bcrypt.compare(currentPassword, Owner.passwordHash)` (wrong → `fieldErrors.currentPassword`), hash the new one (`bcrypt.hash`, same cost as signup), a **rate limit** on attempts, and **invalidate the owner's other sessions** (e.g. a `passwordChangedAt` / session version checked when verifying the JWT). Password values are never returned to the browser: after any result the fields come back empty. The UI says the mock didn't save anything |
| `requestAccountDeletion(ownerId, kennelId, { confirmName })` | **nothing: the mock never deletes** | `confirmName` must equal the kennel's name exactly (case-sensitive; `confirmNameMismatch`). On success the UI shows "Preview only… Nothing was deleted." |

**Real account deletion: the order and why.** Delete in this order, in one database transaction (after the external part):

1. **Cloudinary assets** (gallery photos, dog photos, health and verification documents, logo): delete them first via the Admin API with the server secret, or **queue** them (a job table processed after commit) so a Cloudinary failure can't leave the database half-deleted. Assets are outside the transaction, so they come first or are queued.
2. `Media` rows.
3. Reviews and their replies (`Review`), then `ReviewInvite`.
4. Lead data: `LeadEvent`, `LeadNote`, `Message`, `Conversation`, `WaitlistEntry` (children before their parents; most cascade from `Lead`).
5. `Lead` (clear `Dog.reservedForLeadId` first, or rely on `SetNull`).
6. `Dog`, **after clearing `Litter.damId` / `sireId`** that point at the kennel's dogs (no cascade there, so deleting dogs first would fail on those references).
7. `Litter`.
8. `NotificationPreference`, `VerificationRequest`, `Notification` / activity rows.
9. `Kennel`, then `Owner`. Then clear the session cookie and sign out.

**Product decision (open):** delete immediately, or offer a **grace period** (e.g. mark the account `deletionRequestedAt`, hide the public page at once, delete for good after 14–30 days unless the owner signs in and cancels).

---

## Notification preferences (`notificationPreferences.ts`)

```prisma
model NotificationPreference {    // NEW MODEL
  ownerId      String  // → Owner, onDelete: Cascade
  type         NotificationPreferenceType // NEW_LEAD | NEW_MESSAGE | NEW_REVIEW | WAITLIST_ACTIVITY | VERIFICATION_UPDATE
  emailEnabled Boolean
  @@id([ownerId, type])
}
```

| Function | Output / writes | Notes |
| --- | --- | --- |
| `getNotificationPreferences(ownerId)` | `{ type, emailEnabled }[]` (all five, display order) | a type with no row uses the default: **all on except `WAITLIST_ACTIVITY`** |
| `updateNotificationPreferences(ownerId, prefs)` | upsert one row per type | the action whitelists the five types (a checked switch posts `on`) |

**Preferences have no effect until an email provider exists.** In-app alerts are always on; the UI says email notifications start once email sending is connected.

---

## Verification (`verification.ts`)

```prisma
model VerificationRequest {       // NEW MODEL (one current request per kennel)
  id               String   @id @default(uuid())
  kennelId         String   @unique // → Kennel, onDelete: Cascade
  status           VerificationStatus @default(NOT_SUBMITTED) // NOT_SUBMITTED | PENDING | APPROVED | REJECTED
  cbkcRegistration String?  // ≤ 40 (also keep Kennel.cbkcRegistration, which exists, in sync)
  documentUrls     String[] // 1–5 Cloudinary image URLs (or Media rows with a VERIFICATION category, which would also keep the file names)
  submittedAt      DateTime?
  decidedAt        DateTime?
  reviewerNote     String?
}
```

How the kennel is registered: `Kennel.cnpj` exists; **a CPF is a NEW FIELD** (`Kennel.cpf String? @unique`, or a `registrationType` + `registrationNumber` pair). Both are set on the Kennel profile tab (see Kennel profile). The mock reads them from the real Kennel row until the profile tab saves new ones (`readRegistration` in `kennelProfile.ts`, shared by both tabs).

| Function | Output / writes | Notes |
| --- | --- | --- |
| `getVerification(kennelId)` | `{ request, registration: { type: "CNPJ" \| "CPF", maskedNumber } \| null, registrationMissing, cbkcOnFile }` | **masked on the server**: a CNPJ is shown formatted in full (`12.345.678/0001-90`, public company data); a CPF as `***.456.789-**` (personal data; **never return the full CPF to the client**). Neither on file → `registrationMissing: true` and the UI disables submitting |
| `getVerificationStatus(kennelId)` | `VerificationStatus` | Overview checklist |
| `submitVerification(kennelId, { cbkcRegistration?, documentUrls })` | status `PENDING`, `submittedAt = now()`, clears `decidedAt` / `reviewerNote` | only from `NOT_SUBMITTED` or `REJECTED` (`verificationNotEditable`); requires a CNPJ or CPF on file (`registrationMissing`); 1–5 documents, `https://res.cloudinary.com/` URLs only; CBKC ≤ 40. The action redirects with `?notice=submitted` |
| `withdrawVerification(kennelId)` | `PENDING` → `NOT_SUBMITTED` (keeps CBKC + documents) | otherwise `verificationNotPending`. Redirects with `?notice=withdrawn` |

Approving or rejecting (setting `decidedAt`, `reviewerNote`, and `Kennel.isVerified`) is an admin/moderation task, out of scope.

**DEV-ONLY testing aid — delete when the real function is written.** In development builds only (`NODE_ENV !== "production"`), the Verification page passes `?state=none|pending|rejected|approved` and `?registration=cnpj|cpf|none` to `getVerification`, which **puts the mock store in that state** (so the screen's actions work from it). Production builds ignore both params. The code is marked `DEV-ONLY TESTING AID` in `verification.ts` and in the page.

---

## Kennel profile (`kennelProfile.ts`)

**Partly real today.** The first read builds the profile from the real `Kennel` row, its `KennelBreed` rows and the owner's email/phone; the slug check reads real kennels; breed options come from the real `Breed` table and the dog/litter counts from real `Dog` / `Litter` rows. **Saved changes live in the mock store** (`kennelProfiles[kennelId]`, `registration`) and nothing is written to the database. `getCurrentKennel()` applies the saved name, slug, city, state and logo (temporary, so the sidebar updates), and `requestAccountDeletion` compares against the saved name.

**Security (all mutations):**

- `kennelId` comes **only from the verified session** (`getCurrentKennel()` → `verifyKennelSession()`), never from the form or a URL.
- **Whitelist the fields.** `parseKennelProfile` reads named fields into an explicit typed object; never spread the request body into a Prisma `update`.
- **Re-check slug uniqueness at write time** and rely on the existing `@unique` index on `Kennel.slug`: catch Prisma `P2002` on `slug` and return `fieldErrors.slug = slugTaken`. The client's live check is only a hint. Same for `cnpj` (`@unique`, exists) and the new `cpf` (`registrationTaken`).
- A new logo/cover URL must be a `https://res.cloudinary.com/` upload (the saved URL may stay as it is).

### Field mapping (form → Prisma)

| Form field | Prisma | Rule |
| --- | --- | --- |
| `name` | `Kennel.name` | 2–80 |
| `slug` | `Kennel.slug` (`@unique`) | 3–40, `[a-z0-9]` and single hyphens, no leading/trailing hyphen; not reserved (`dashboard`, `admin`, `api`, `login`, `signup`, `kennel`, `kennels`, `settings`); not used by another kennel |
| `city`, `state` | `Kennel.city`, `Kennel.state` | city required (≤ 80); state one of the 27 Brazilian UF codes. **Also update `Kennel.location`** (`"City, ST"`, the public card's display string) |
| `description` | `Kennel.description` | ≤ 1000 |
| `logoUrl` / `logoPublicId` | `Kennel.logoUrl`, **NEW FIELD** `Kennel.logoPublicId String?` | square, cropped in the widget. A saved logo can be replaced, not removed (`logoRequired`) |
| `coverUrl` / `coverPublicId` | **NEW FIELDS** `Kennel.coverUrl String?`, `Kennel.coverPublicId String?` | wide (3:1 crop); removable after a confirmation |
| `breedIds[]` | `KennelBreed` rows | 1–3 ids of existing `Breed` rows |
| `registrationType` + `registrationNumber` | `Kennel.cnpj` (exists) / **NEW FIELD** `Kennel.cpf String? @unique` (or `registrationType` + `registrationNumber`, as Step 6a noted) | digits only; CNPJ 14 digits with both check digits, CPF 11 with both (hand-written validators in `validation/kennelProfile.ts`). Empty number = keep what's on file |
| `cbkcRegistration` | `Kennel.cbkcRegistration` | ≤ 40 |
| `breedingSince` | **NEW FIELD** `Kennel.breedingSince Int?` | 1950–current year |
| `phone`, `email`, `website`, `instagram`, `whatsapp` + `…Public` | **NEW FIELDS** one value + one `Boolean` each (`contactPhone`/`contactPhonePublic`, …), or a `KennelContact` model (`kennelId`, `channel` enum, `value`, `isPublic`, `@@unique([kennelId, channel])`) | phone/WhatsApp: 10–15 digits with an optional `+` (spaces, dashes, dots and parentheses allowed); email well-formed (stored lower-case); website http(s); Instagram handle (stored without `@`). **A row can be public only with a value** (`publicNeedsValue`). The public page shows only public rows; messages always go to the inbox |
| `address` | **NEW FIELD** `Kennel.address String?` | ≤ 200 |
| `latitude`, `longitude` | `Kennel.latitude`, `Kennel.longitude` (exist) | both or neither; −90..90 / −180..180 (accepts a comma decimal) |
| `timeZone` | **NEW FIELD** `Kennel.timeZone String @default("America/Sao_Paulo")` | one of: `America/Sao_Paulo`, `America/Fortaleza`, `America/New_York`, `America/Chicago`, `America/Denver`, `America/Phoenix`, `America/Los_Angeles`, `America/Anchorage`, `Pacific/Honolulu` |

### Functions

| Function | Output / writes | Notes |
| --- | --- | --- |
| `getKennelProfile(kennelId)` | `KennelProfile` (or null) | identity, logo/cover (`{ url, publicId }`), breeds with `dogCount` / `litterCount` (matched with `isSameBreed`, since `Dog.breed` is free text), registration (**`maskedNumber` only**), contact, location, `timeZone`, `verificationStatus`, `publicPagePath` |
| `listBreedOptions()` | `{ id, name }[]` | REAL: every `Breed` row, by name |
| `getKennelTimeZone(kennelId)` | `string \| null` | `Kennel.timeZone`; null when none is set. Read by `getViewerToday()` |
| `checkSlugAvailability(kennelId, slug)` | `{ available, reason?: "taken" \| "reserved" \| "invalid" }` | format + reserved list + other kennels. Called by a Server Action from the client 400 ms after typing stops |
| `saveKennelProfile(kennelId, input)` | all sections (rows below) | **the only mutation; the form's action calls it.** (Step 7a removed the per-section `updateKennel…` functions: no screen used them. Split it again if a screen ever saves one section.) Every database check first (slug, breeds exist, registration number not used elsewhere), then every write. **Real version: one `prisma.$transaction`**, so a failed save writes nothing |
| ↳ identity section | name, slug, city, state, description, timeZone | re-checks the slug |
| ↳ images section | URLs + publicIds | **the real version deletes the replaced/removed Cloudinary assets** (Admin API with the server secret, by `publicId`), after the transaction commits, or through a queue. The mock deletes nothing |
| ↳ breeds section | `KennelBreed` | **in one transaction:** `deleteMany` the kennel's rows not in the list, `createMany` the new ones (`skipDuplicates`). Removing a breed keeps its dogs and litters (they're free text); its public tab disappears. Stop dual-writing `Kennel.primaryBreeds` (deprecated) or write it in the same transaction |
| ↳ registration section (`{ type, number, cbkcRegistration, breedingSince }`) | `cnpj` / `cpf`, `cbkcRegistration`, `breedingSince` | `number: null` keeps the stored number. Saving a number of the other type clears the old one. **Real backend: a new number while verification is `PENDING` or `APPROVED` sets the request back to review** (`PENDING`, clear `decidedAt`, `Kennel.isVerified = false` until re-approved). The mock never changes the status; the UI says so |
| ↳ contact section | contact rows | |
| ↳ location section (`{ address, latitude, longitude }`) | `address`, `latitude`, `longitude` | |
| `lookupAddress(address)` | `{ lat, lng, formatted } \| null` | **MOCK ONLY, no network call:** a table of Brazilian city centers, then a state code (`…, PR`) → that state's capital, else null. **Real version:** call a geocoding provider **server-side** (key in a server env var, rate-limited), and **round the result to about 3 decimals (≈ 100 m) before storing**, for the breeder's privacy |
| `getProfileStrength(kennelId)` | `{ percent, missing: { key, href }[] }` | from **saved** data. Weights (sum 100): identity 10, logo 15, cover 10, description ≥ 150 characters 15, ≥ 1 breed 10, ≥ 1 public contact 10, coordinates 10, verification 20 (`APPROVED`; `PENDING` earns 10). Verification is the card's separate nudge, not a `missing` item |
| `getKennelPublicPreview(values)` (`kennelPreview.ts`) | preview data | pure, runs on the client from the unsaved form |

**Registration masking rule.** The full CNPJ/CPF never reaches the browser on this tab: `getKennelProfile` returns `maskedNumber` (`••.•••.•••/••••-10`, `•••.•••.•••-09`), the field starts empty with the mask as placeholder, and the action never echoes a typed number after a successful save. (Verification still shows a CNPJ in full, per Step 6a.)

**Slug changes and old links.** Nothing redirects old slugs yet; the form warns "Changing this breaks old links to your page." **Recommended:** a `KennelSlugHistory` model (`slug @unique`, `kennelId`, `createdAt`) written in the same transaction when the slug changes, and `/kennel/[slug]` doing a permanent redirect (308) from a historical slug to the current one. A historical slug should stay unavailable to other kennels (check it in `checkSlugAvailability`).

**Time zone.** `Kennel.timeZone` is what the server uses for "today" in follow-ups and reminders (Leads' "Today", overdue checks, reminder emails). `getViewerToday()` already reads it through `getKennelTimeZone(kennelId)` (mock: the saved profile's zone, or null), with the cookie and the default as fallbacks.

---

## Schema changes implied so far

None are made in this step. Collected here for planning:

- New models: `Lead`, `Message` (+ conversation), `Notification`, `ActivityEvent`, `Review` (already planned).
- New fields: `Lead.followUpAt`, `Message.readAt`, `Notification.readAt`, `Kennel.verificationRequestedAt`, possibly `Kennel.coverUrl`.
- Dogs (Step 2): `Dog.litterId String?` (relation to `Litter`, `onDelete: SetNull`), `Dog.archivedAt DateTime?`, `Media.position Int`, `Media.category` enum (`GALLERY` | `HEALTH_DOCUMENT`), `Media.label String?`, `Media.fileName String?`.
- Step 4a: models `Lead`, `LeadEvent`; enums `LeadStage`, `LeadSource`, `PreferredContact`, `LeadEventType`; `@@unique([kennelId, email])` on `Lead`.
- Step 4b: `LeadStage.LOST`, enum `LostReason`, `Lead.lostReason`; models `LeadNote`, `Conversation` (one per lead), `Message` (`direction`, `readAt`); `Dog.reservedForLeadId String? @unique` (who holds the puppy); `@@unique([litterId, leadId])` on `WaitlistEntry`; `Kennel.timeZone String` (IANA name) for "today" on the server.
- Step 5: `Message.sharedDogId String?` (→ `Dog`, `onDelete: SetNull`); `Media.caption String?`, `Media.position Int` (also Step 2), enum `VideoProvider` + `Media.provider VideoProvider?`, `Media.thumbnailUrl String?`, possibly `Media.publicId String?` (Cloudinary deletion) and `Media.width/height Int?`. Optional `auto` key in `STAGE_CHANGED` params (JSON, no migration).
- Step 6a: models `Review` (with reply + report columns, or a `ReviewReply` model), `ReviewInvite`, `NotificationPreference`, `VerificationRequest`; enums `ReviewReportReason`, `NotificationPreferenceType`, `VerificationStatus`; `Owner.locale String?`; `Kennel.cpf String? @unique` (or a registration type + number); recommended aggregates `Kennel.ratingAverage Float`, `Kennel.reviewCount Int`; for real deletion possibly `deletionRequestedAt` (grace period) and an asset-deletion queue. Replaces the earlier `Kennel.verificationRequestedAt` idea.
- Step 3: `Dog.registrationNumber String?`; new model `WaitlistEntry` (`litterId` → `Litter` with `onDelete: Cascade`, `leadId` → `Lead`, `position`, `note`, `createdAt`). Not new: `Litter.name`, `Litter.bornAt` (exist). Consider making `Litter.name` required.
- Step 6b: `Kennel.logoPublicId String?`, `Kennel.coverUrl String?`, `Kennel.coverPublicId String?`, `Kennel.breedingSince Int?`, `Kennel.address String?`, `Kennel.timeZone String @default("America/Sao_Paulo")` (same field as Step 4b), `Kennel.cpf String? @unique` (or registration type + number, as in Step 6a), contact fields (five values + five `…Public Boolean`, or a `KennelContact` model with a `ContactChannel` enum), recommended `KennelSlugHistory` (old-slug redirects). Keep `Kennel.location` in sync with city/state. Replaces the earlier "possibly `Kennel.coverUrl`".

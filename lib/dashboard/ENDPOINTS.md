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
- **Output:** `{ id, name, slug, city, state, logoUrl, ownerName, ownerInitials }`, or `null` when there's no session or the owner hasn't created a kennel yet.
- **Prisma:** `Kennel` (`id`, `name`, `slug`, `city`, `state`, `logoUrl`) + `Owner.fullName`. No schema change.
- **Notes:** `ownerInitials` is derived from the first and last words of `fullName`. Wrapped in React `cache()`, so the layout and page share one query per request.

### `getNavCounts(kennelId): Promise<NavCounts>`: MOCK, read

- **Output:** `{ newLeads: number, unreadMessages: number }`. A badge is hidden when its count is 0.
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

**`setupSteps: SetupStep[]`.** Six `{ key, done }` items, always in this order. The page computes the percentage and hides the card when all are done.

| key | Suggested `done` rule |
| --- | --- |
| `kennelDetails` | `Kennel.description` is non-empty and `city`/`state` are set |
| `logoAndCover` | `Kennel.logoUrl` is set, plus a cover photo (no cover field exists yet: maybe the first kennel-level `Media` photo, or a new `Kennel.coverUrl`) |
| `breeds` | the kennel has ≥ 1 `KennelBreed` |
| `firstDog` | the kennel has ≥ 1 `Dog` |
| `photos` | the kennel has ≥ N `Media` rows of type `PHOTO` (pick N) |
| `verification` | a verification has been requested. **Implies** a new field, e.g. `Kennel.verificationRequestedAt DateTime?` (`isVerified` already exists for the approved state) |

**`metrics: OverviewMetrics`**

| field | Meaning | Source |
| --- | --- | --- |
| `newLeads.count` | leads in status `NEW` | `Lead` (future) |
| `newLeads.sinceYesterday` | new leads created since the start of yesterday | `Lead.createdAt` |
| `unreadMessages.count` | same as `getNavCounts().unreadMessages` | `Message` (future) |
| `unreadMessages.oldestUnreadAt` | `createdAt` of the oldest unread buyer message, or `null` | `Message` |
| `availablePuppies.count` | non-archived dogs with `status = AVAILABLE_PUPPY` (same rule as the Dogs list, so the two screens agree) | `Dog` (exists) |
| `availablePuppies.litterCount` | distinct `litterId`s among those puppies | needs `Dog.litterId` (NEW FIELD) |
| `activeLitters.count` | litters with status `AVAILABLE` or `RESERVED` (decide whether `PLANNED` counts) | `Litter` (exists) |
| `activeLitters.nextGoHomeAt` | soonest future `Litter.expectedGoHomeDate` among active litters, or `null` | `Litter` (exists) |

The UI turns these timestamps into "Oldest waiting 2 days" and "Next go-home in 12 days", so return dates rather than pre-computed day counts.

**`recentActivity: ActivityItem[]`.** The 5 latest events, newest first. Each item is `{ id, type, params, createdAt }`. The UI writes the sentence from `type` + `params`, in the viewer's language, so store data, not text.

| type | params | Written when |
| --- | --- | --- |
| `NEW_LEAD` | `{ name, subject }` | a lead is created |
| `NEW_MESSAGE` | `{ name, excerpt }` | a buyer sends a message |
| `NEW_REVIEW` | `{ reviewerName, rating }` (one reviewer name) | a review is posted (`Review` model is future work) |
| `DOG_STATUS_CHANGED` | `{ dogName, status: DogStatus }` | a dog's status changes |
| `LITTER_BORN` | `{ damName, puppyCount }` | a litter is marked born |

**Implies** an **`ActivityEvent` model**: `id`, `kennelId`, `type` (enum of the values above), `params Json`, `createdAt`, written by the code paths that cause each event. Query: `where kennelId, orderBy createdAt desc, take 5`. Snapshot names into `params` (don't join live), so the log stays correct after a dog is renamed or deleted.

**`upcoming: UpcomingItem[]`.** The next 4 items, soonest first (`dueAt` ascending), including overdue ones.

| type | params | Source |
| --- | --- | --- |
| `LEAD_FOLLOW_UP` | `{ leadName }` | **implies** `Lead.followUpAt DateTime?`; take leads with `followUpAt` set |
| `LITTER_GO_HOME` | `{ litterName, puppyCount, reservedCount }` | `Litter.expectedGoHomeDate` (exists); `reservedCount` needs puppies linked to litters (`Dog.litterId`) |

Merge both sources in code, sort by `dueAt`, take 4.


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
| Bloodline | `lineage` | `Dog.lineage` | |
| Pedigree link | `pedigreeUrl` | `Dog.pedigreeUrl` | http(s) only |
| Sire / Dam | `sireName` / `damName` | `Dog.sireName` / `Dog.damName` | plain text |
| Bio | `bio` | `Dog.bio` | ≤ 800 |
| Photos | `photos: string[]` (ordered) | `Media` type `PHOTO` with `dogId` + **NEW FIELD** `Media.position Int` | first = cover. Keep `Dog.photoUrls` dual-written (like `Kennel.primaryBreeds`) until every reader uses `Media` |
| Health documents | `healthDocuments: {id,url,label,fileName}[]` | `Media` with `dogId` + **NEW FIELDS** `Media.category` (enum: `GALLERY` / `HEALTH_DOCUMENT`), `Media.label String?`, `Media.fileName String?` | images only, ≤ 10 |
| (archive) | `archivedAt` | **NEW FIELD** `Dog.archivedAt DateTime?` | soft delete |

### Reads

**`listDogs(kennelId, { status?, q?, breed?, sex?, stage?, page, pageSize }): Promise<DogListResult>`**: MOCK

- **Output:** `{ items: DogListItem[], total, page, pageSize }`. Items: `{ id, name, breed, sex, lifeStage, birthDate, status, coverPhotoUrl }`, newest first (`createdAt desc`).
- **Rules:** `where kennelId, archivedAt: null` plus each filter (AND). `q` matches `name` or `registry`, case- and **accent-insensitive** ("perola" finds "Pérola"). Prisma's `mode: "insensitive"` handles case only; accents need Postgres `unaccent` (raw query or a generated, unaccented search column).
- **Search note:** the design says "registry", but the schema stores only the club. Searching by a real registration number needs a new field (e.g. `Dog.registrationNumber`).
- `coverPhotoUrl` = the `Media` photo at position 0 (or `photoUrls[0]`).

**`getDogStatusCounts(kennelId): Promise<DogStatusCounts>`**: MOCK

- `{ all, breedingStock, availablePuppy, reserved, sold }` for non-archived dogs. Ignores the other filters, so tab counts don't jump while searching. One `groupBy status` query.

**`getDogForEdit(kennelId, dogId): Promise<DogForEdit | null>`**: MOCK

- Everything in the mapping table, plus `id`, `slug`, `archivedAt`. Returns `null` when the dog doesn't exist **or belongs to another kennel** (`where: { id, kennelId }`); the page then 404s. Archived dogs are returned (the page shows a notice).

**`getKennelBreeds(kennelId): Promise<{ id, name }[]>`**: MOCK, but can be REAL today: `KennelBreed` → `Breed` already exists. Kept as a mock in this step so the breeds match the mock dogs (Labrador Retriever, Poodle).

**`getLitterOptions(kennelId): Promise<{ id, label, bornAt }[]>`**: MOCK

- The kennel's litters for the puppy litter selector, newest first. `label` is built from stored names, "Dam × Sire · Litter name" (no translated words in it); the UI appends the formatted birth date or "(planned)". Uses existing `Litter` fields (`name`, `bornAt`, `dam`, `sire`).

### Mutations

All five return `{ ok: true, ... } | { ok: false, fieldErrors, formError? }`, where errors are translation keys (`dashboard.common.errors.*`) plus params. For **every** mutation the real implementation must:

- **(a) check ownership:** the dog must belong to `kennelId` (`where: { id: dogId, kennelId }` or check before writing), otherwise return `formError: { key: "notFound" }`. `kennelId` always comes from the session (`getCurrentKennel()`), never from the form.
- **(b) take explicit typed input only.** The Server Actions in `app/[locale]/dashboard/dogs/actions.ts` parse `FormData` with `parseDogFormData()` (a whitelist of the form's keys) and validate with `validateDogInput()` (`lib/dashboard/validation/dog.ts`) before calling these functions. Never spread raw request input into `prisma.dog.create/update`. The old `/api/dogs` routes do `data: { ...body }`, which lets a client set any column, including `kennelId` (mass assignment). The dashboard no longer calls them.

| Function | Writes | Notes |
| --- | --- | --- |
| `createDog(kennelId, input: DogInput)` → `{ ok, dog: { id, slug } }` | `Dog` (all mapped fields, `kennelId`), `Media` rows for photos (with `position`) and documents | **slug** is generated once from the name (`slugify` + `nextAvailableSlug`, unique per kennel) and **never changes on rename**, so public links don't break |
| `updateDog(kennelId, dogId, input)` | `Dog` mapped fields; replaces the dog's photo/document `Media` rows to match the arrays (delete removed, upsert the rest with new `position`) | `slug` untouched |
| `updateDogStatus(kennelId, dogId, status)` | `Dog.status` | quick menu on the list; status validated against the enum |
| `archiveDog(kennelId, dogId)` | `Dog.archivedAt = now()` | hidden from the list, counts and public site |
| `deleteDog(kennelId, dogId)` | deletes `Dog`; its `Media` cascade (`onDelete: Cascade` exists); also clear `Litter.damId`/`sireId` that point at it (no cascade there) | permanent |

---

## Schema changes implied so far

None are made in this step. Collected here for planning:

- New models: `Lead`, `Message` (+ conversation), `Notification`, `ActivityEvent`, `Review` (already planned).
- New fields: `Lead.followUpAt`, `Message.readAt`, `Notification.readAt`, `Kennel.verificationRequestedAt`, possibly `Kennel.coverUrl`.
- Dogs (Step 2): `Dog.litterId String?` (relation to `Litter`), `Dog.archivedAt DateTime?`, `Media.position Int`, `Media.category` enum (`GALLERY` | `HEALTH_DOCUMENT`), `Media.label String?`, `Media.fileName String?`. Optional: `Dog.registrationNumber` for registry-number search.

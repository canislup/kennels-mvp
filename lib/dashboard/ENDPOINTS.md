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

- **Output:** the 5 latest, newest first: `{ id, title, detail, createdAt, read }[]`.
- **Implies:** a **`Notification` model**: `id`, `kennelId`, `title`, `detail`, `createdAt`, `readAt DateTime?` (`read = readAt != null`). Query: `where kennelId, orderBy createdAt desc, take 5`.
- **Open question:** `title`/`detail` are stored as text, so they appear in the language they were written in. If you want notifications translated like Recent activity, store `type` + `params` instead (see `ActivityItem`) and change this type.
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
| `availablePuppies.count` | dogs with `status = AVAILABLE_PUPPY` | `Dog` (exists) |
| `availablePuppies.litterCount` | distinct litters those puppies belong to | needs `Dog.litterId` (not in schema yet); until then, count litters with `status = AVAILABLE` |
| `activeLitters.count` | litters with status `AVAILABLE` or `RESERVED` (decide whether `PLANNED` counts) | `Litter` (exists) |
| `activeLitters.nextGoHomeAt` | soonest future `Litter.expectedGoHomeDate` among active litters, or `null` | `Litter` (exists) |

The UI turns these timestamps into "Oldest waiting 2 days" and "Next go-home in 12 days", so return dates rather than pre-computed day counts.

**`recentActivity: ActivityItem[]`.** The 5 latest events, newest first. Each item is `{ id, type, params, createdAt }`. The UI writes the sentence from `type` + `params`, in the viewer's language, so store data, not text.

| type | params | Written when |
| --- | --- | --- |
| `NEW_LEAD` | `{ name, subject }` | a lead is created |
| `NEW_MESSAGE` | `{ name, excerpt }` | a buyer sends a message |
| `NEW_REVIEW` | `{ authorName, rating }` | a review is posted (`Review` model is future work) |
| `DOG_STATUS_CHANGED` | `{ dogName, status: DogStatus }` | a dog's status changes |
| `LITTER_BORN` | `{ damName, puppyCount }` | a litter is marked born |

**Implies** an **`ActivityEvent` model**: `id`, `kennelId`, `type` (enum of the values above), `params Json`, `createdAt`, written by the code paths that cause each event. Query: `where kennelId, orderBy createdAt desc, take 5`. Snapshot names into `params` (don't join live), so the log stays correct after a dog is renamed or deleted.

**`upcoming: UpcomingItem[]`.** The next 4 items, soonest first (`dueAt` ascending), including overdue ones.

| type | params | Source |
| --- | --- | --- |
| `LEAD_FOLLOW_UP` | `{ leadName }` | **implies** `Lead.followUpAt DateTime?`; take leads with `followUpAt` set |
| `LITTER_GO_HOME` | `{ litterName, puppyCount, reservedCount }` | `Litter.expectedGoHomeDate` (exists); `reservedCount` needs puppies linked to litters (`Dog.litterId`) |

Merge both sources in code, sort by `dueAt`, take 4.

---

## Schema changes implied so far

None are made in this step. Collected here for planning:

- New models: `Lead`, `Message` (+ conversation), `Notification`, `ActivityEvent`, `Review` (already planned).
- New fields: `Lead.followUpAt`, `Message.readAt`, `Notification.readAt`, `Kennel.verificationRequestedAt`, possibly `Kennel.coverUrl`, and `Dog.litterId` to link puppies to their litter.

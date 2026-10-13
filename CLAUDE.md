# KennelOS - AI Agent Guardrails & Project Context

## Project Overview

KennelOS is a dual-sided B2B2C platform.

1. **The Private SaaS:** A premium management platform designed for professional dog breeders to handle dog rosters, litters, waitlists, and revenue tracking.
2. **The Public Marketplace:** A centralized, consumer-facing directory that makes searching for high-quality kennels and puppies easy. It provides breeders with beautiful, modern, and elegant presentation profiles to combat the industry standard of outdated and poorly designed breeder websites.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Database ORM:** Prisma
- **Database:** PostgreSQL
- **Styling:** Tailwind CSS
- **Icons:** `lucide-react`
- **Image Management:** Cloudinary (`next-cloudinary`)
- **Internationalization:** `next-intl`

## Architectural Paradigms & Rules

### 1. The B2B2C Routing Strategy

- **Private Routes (`/[locale]/dashboard/*`):** These routes are strictly for kennel owners. They require authentication via `verifyKennelSession()`. The UI focus here is data density, efficiency, and management.
- **Public Routes (`/[locale]/kennels`, `/[locale]/kennel/[slug]`):** These are consumer-facing pages. They must be highly optimized for SEO, fully Server-Side Rendered (SSR) where possible, and focus heavily on a premium, elegant, and trustworthy user experience.

### 2. Component Strategy ("Interactive Islands")

- **Default to Server Components:** All pages (`page.tsx`) and layouts (`layout.tsx`) MUST be Server Components by default. Fetch data securely here using Prisma.
- **Client Components:** Use `"use client"` ONLY for the smallest possible interactive UI components (modals, carousels, forms). Pass data down to these components from the Server Component via props.

### 3. Form Handling (Next.js Modern Pattern)

- **Avoid Controlled State:** Do NOT use `useState` for every form input.
- **Use Form Actions:** Rely on the `action={...}` attribute on the `<form>` element and native `FormData` extraction (`formData.get('inputName')`).
- **Mutation Refreshes:** After a successful API mutation in a Client Component, ALWAYS call `router.refresh()` to invalidate the client cache and trigger the Server Component to refetch the fresh data.

### 4. Database & Prisma

- **UUIDs:** Rely on Prisma's `@default(uuid())` for ID generation.
- **Slugs:** Public kennel profiles must use URL-friendly slugs (e.g., `/kennel/golden-meadows`) generated and stored in the database.
- **Schema Updates:** Always run `npx prisma db push` and `npx prisma generate` after modifying `schema.prisma`.

### 5. Styling & UI/UX Guidelines (The "KennelOS" Aesthetic)

- **Internal Dashboard Vibe:** Clean, modern SaaS combined with pet-centric warmth.
- **Public Profile Vibe:** Premium, elegant, and highly trustworthy. Use clean typography, warm accent tones, and high-quality image galleries to ensure kennels look highly professional.
- **Color Palette (warm stone — canonical; use these exact hex values, e.g. `text-[#1C1917]`):**
  - Background: `#FFFFFF`.
  - Text — primary: `#1C1917`; secondary: `#57534E`; muted: `#78716C` / `#A8A29E`.
  - Borders: `#E7E2DA`.
  - Accent / primary action: `#4F46E5` (hover: `#4338CA`).
  - Success / verified: text `#166534` on background `#DCFCE7` (solid badge variant: white text on `#166534`).
  - Warning / prestige badge: text `#92400E` on background `#FEF3C7`.
  - Soft card backgrounds: `#F5F1EA`, `#F0ECE3`.
  - Dark surfaces (footer, CTA banners): background `#1C1917`, text `#FBF9F6`.
  - Destructive: background `#FEF2F2`, text `#DC2626`.
- **Shapes & Shadows:** Use generous border radiuses (`rounded-xl`, `rounded-2xl`) and soft shadows (`shadow-sm`, `shadow-md`).

#### Kennel-owner dashboard (`/[locale]/dashboard/*`): overrides the public rules above

- **White backgrounds, border separation.** Page, sidebar, top bar, cards, popovers and drawer are all `bg-white`. Never use the off-white tint from the design files (#FAF8F4 / #F5F1EA): use white for large surfaces and `stone-50` for small inset surfaces and hover states. Separation comes from 1px borders (`border-line` on cards and dividers, `border-r` on the sidebar, `border-b` on the mobile top bar), never from shadows. Only floating layers (popovers, menus, the mobile drawer) get `shadow-md`.
- **Tokens only, no arbitrary hex in components.** Tokens are defined in the `@theme` block of `app/globals.css`:
  - Borders: `line` #E7E2DA (cards, dividers), `line-strong` #D6D0C4 (inputs, secondary buttons).
  - Text: Tailwind's `stone` scale, pinned to exact hex values: `stone-900` #1C1917 primary, `stone-700` #44403C, `stone-600` #57534E secondary, `stone-500` #78716C muted, `stone-400` #A8A29E faint. Inset and hover surfaces: `stone-50`, `stone-100`.
  - Accent: `accent` #4F46E5, `accent-hover` #4338CA, `accent-soft` #EEF2FF (active and selected tint). Re-theme by editing these three lines.
  - Status, ink on tint: `status-green` #166534 / `status-green-bg` #DCFCE7 (`status-green-solid` #16A34A for filled checks); `status-amber` #92400E / `-bg` #FEF3C7 (`status-amber-solid` #D97706 for bars); `status-blue` #1E40AF / `-bg` #DBEAFE; `status-pink` #9D174D / `-bg` #FCE7F3; `status-red` #B91C1C / `status-red-strong` #DC2626 / `-bg` #FEF2F2.
  - Placeholder gradient: `sand-light` #E8D9C0 → `sand-dark` #C9A063.
- **Fonts.** Two fonts, loaded with `next/font` (`lib/fonts.ts`) and applied only in the dashboard layout (`dashboardFontClasses`): `font-display` (Playfair Display) for headings and big numbers, `font-body` (Work Sans) for everything else.
- **Shapes.** Cards `rounded-2xl`, controls `rounded-xl`, pills `rounded-full`.
- **Building blocks.** Use the primitives in `components/dashboard/ui/` (Button, Card, Badge, PageHeader, ProgressBar, EmptyState) before writing new markup.
- **Data.** Dashboard pages and components read and write only through the async functions in `lib/dashboard/*.ts`, never Prisma and never `lib/dashboard/mock/` directly. Each function's backend contract is listed in `lib/dashboard/ENDPOINTS.md`; keep it updated when adding functions.
- **Forms (dashboard pattern, see Dog-Edit).**
  - The page is a Server Component; the `<form action={formAction} noValidate>` lives in a small Client Component that uses `useActionState(serverAction, initialState)`. Bind ids on the server (`saveDogAction.bind(null, dog.id)`) and pass the bound action down instead of putting ids in form fields. A bound argument is **not** tamper-proof (Next.js encrypts closures, not `.bind` arguments), so every data function still checks that the record belongs to the session's kennel.
  - Inputs are uncontrolled (`defaultValue`), with no `useState` per input. Keep `<select>`s uncontrolled too: a controlled select has no default option, so React's post-action form reset blanks it. To re-filter a select's options from other state (e.g. parents by breed), remount it with a `key` instead. The action returns the submitted `values` and the form remounts its fields with a `submission` counter (`key={state.submission}`), because React resets uncontrolled fields after an action and applies a `<select>`'s `defaultValue` only on mount.
  - Composite controls (segmented choices, photo/document managers) keep local state and submit through native or hidden inputs (`SegmentedControl` uses real radios; managers render one hidden input per item). When React state changes a hidden input, call `notifyFormChange(el)` so `SaveBar` notices.
  - Validation runs on the server in hand-written functions (`lib/dashboard/validation/*`): parse `FormData` into an explicit typed input (whitelist; never spread raw input), validate, and return errors as translation keys + params (`dashboard.common.errors.*`). The UI translates them, shows them inline via `Field` (`aria-describedby` / `aria-invalid`), and moves focus to the first error.
  - `SaveBar` (sticky) shows "unsaved changes" by comparing serialized `FormData` to a baseline, warns on `beforeunload`, and shows "All changes saved" after an edit. Create redirects to the list with `?notice=…`.
  - Primitives in `components/dashboard/ui/`: `Field`, `TextInput`, `Textarea` (counter), `Select`, `SegmentedControl`, `Toggle`, `SaveBar`, `Notice`, `Modal` (native `<dialog>`: focus trap, Escape, backdrop), `ConfirmDialog` (built on `Modal`), `ImageUploader`, `SubmitButton` (pending state for plain `<form action={serverAction}>` forms that need no result, e.g. Restore).
- **`StatusMenu` (`components/dashboard/ui/StatusMenu.tsx`).** One status menu for every record type (dog pills, the litter "Change status" button, the lead "Move to…" icon). It knows nothing about dogs, litters or leads: pass `value`, `options` (translated labels) and `triggerLabels` (accessible name per value), plus a trigger: `variant="pill"` with `pillLabels`/`pillClasses`, `variant="button"` with `buttonText`, or `variant="icon"` with `icon`. `kind="actions"` makes it a plain command menu (no checked item). Then either `action`, a Server Action bound to the record id (`changeDogStatusAction.bind(null, dog.id)`): the menu updates optimistically, calls it, then `router.refresh()`. Or `onSelect(value)`: the parent applies the change itself (the Leads board, which moves the card). The menu is portalled, flips above the trigger near the viewport bottom, and supports arrow keys, Home/End, Enter and Escape. Don't build another dropdown menu.
- **Dialogs that submit (`FormModal`, `components/dashboard/ui/FormModal.tsx`).** For any action that needs input in a dialog (reschedule, reserve a puppy, mark lost, add to waitlist), use `FormModal` rather than wiring `Modal` + `useActionState` again. Give it a Server Action bound to the record id with the signature `(state: ActionState, formData: FormData) => Promise<ActionState>`. The action validates on the server, returns `{ status: "error", fieldErrors, formError }` (translation keys) or calls `refresh()` and returns `{ status: "done" }`. `FormModal` closes on "done", shows errors only from the current opening, focuses the first invalid field, and native `<dialog>` returns focus to the trigger. It has its own trigger or opens from outside (`open`/`onOpenChange`, e.g. from a `StatusMenu kind="actions"` "More" menu). Yes/no confirmations stay `ConfirmDialog` + `useTransition`; one-click actions with no result to show (Remove, Reopen) are plain `<form action={action.bind(null, id)}>` + `SubmitButton`. `onSuccess` runs after a "done" result (e.g. clear a selection). Build action results with the helpers in `lib/dashboard/actionState.ts` (`INITIAL_ACTION_STATE`, `failed()`, `fromResult()`, which calls `refresh()` on success). **Never render a `FormModal` (or any dialog with a form) inside another `<form>`:** forms can't nest, the server HTML drops the inner form (hydration error #418) and its submit goes to the outer form. Put it next to the form and point the outer submit button at it with `form="<id>"`.
- **Timelines are a union.** A record's history (the lead timeline) merges its event log (`LeadEvent`: type + params, translated in the UI), its notes and its messages, sorted by `createdAt`. Never add events that duplicate a note or a message; render each kind from its own data. Snapshot names into event params.
- **`UrlFilters` (`components/dashboard/ui/UrlFilters.tsx`).** The search box + filter selects for list screens (Dogs, Leads). State lives in the URL: each change sets its param, keeps the others, and drops `page`. Search is debounced and replaces history; selects push. Extra controls (e.g. a Board | List toggle) go in `children`, or in `after` to sit on their own line below. Without `searchLabel` there's no search box (Media). A select with `resets: ["dog"]` also clears those params when it changes (picking a breed clears the dog). `className` replaces the default `mb-6`.
- **Boards with drag-and-drop (see the Leads board).** Keep all drag logic in one small client component that gets plain, already-translated view data from the Server Component. Native HTML5 drag-and-drop (`draggable` cards, `onDragOver`/`onDrop` on columns, with a visible drop highlight) is desktop-only, so every card must also have a keyboard- and touch-friendly path: the `StatusMenu` icon trigger with `onSelect`. Both call the same `move()`: `startTransition(async () => { addOptimistic(move); const result = await serverAction(...) })` with `useOptimistic` over the columns. The Server Action calls `refresh()` from `next/cache`, so the fresh board arrives in the same round trip and the optimistic card never flashes back. On failure the optimistic state reverts by itself; show an error `Notice`. Announce every move in an `aria-live="polite"` region.
- **Dates and "today".** Date-only values ("YYYY-MM-DD": follow-ups, birth and go-home dates) are compared only with other date-only strings. The viewer's day comes from `getViewerToday()` (`lib/dashboard/viewerDate.ts`, server only: the `kennelos_tz` cookie, falling back to `America/Sao_Paulo`). Pure helpers (`daysBetween`, `addDays`, `dateInZone`) are in `lib/dashboard/dateOnly.ts`, which is safe in client code. Never compare a date-only string with a UTC instant.
- **Master-detail screens (see Litters).** Both the filter and the selection live in the URL: `?status=<tab>&litter=<id>`. The page (Server Component) reads them, lists the filtered items, and selects `?litter=` if it's in the filtered list, otherwise the first item. List items are `Link`s that keep the other params (`scroll={false}`, `aria-current="true"` on the selected one) and end in `#<detail-id>`. Below `lg` the detail renders under the list: a tiny client island scrolls to it on selection (only below `lg`), and a "Back to …" link returns to the list. Changing tabs drops the selection. Reload, back and forward then just work.
- **Multi-pane screens (see Messages).** List, thread and side panel are one Server Component page; everything is in the URL (`?conversation=&q=&filter=unread&lead=`). On desktop (`lg`) all panes show and, with no `?conversation=`, the first item is displayed (highlighted from `lg` only). Below `lg` it's one pane at a time, chosen by the URL with CSS (`hidden lg:flex`): no param → the list; a param → the thread with a "Back to …" link. Give flex panes `min-w-0` (and `flex-1` on mobile) or long `truncate`d text widens the page. `?lead=<id>` redirects to that lead's conversation or offers to start one. **Side effects of viewing** (mark as read) run in a tiny client island (`MarkRead`) after mount, never during render: only for an explicitly opened item (`?conversation=`), only when the element is actually visible (`offsetParent !== null`), then the action calls `refresh()` so the list and sidebar badges update. Never for the desktop default: in the Unread filter that would read the first item, drop it from the list, open the next, and so on. The Unread filter keeps the open item listed after it's read.
- **Selection and bulk actions (see the Media grid).** Selection is a `Set` of ids in the one client island that renders the grid; checkboxes have an `sr-only` name ("Select <name>"); only ids still on the page count. A sticky bulk bar appears with ≥ 1 selected (count in `aria-live`, Select all on this page, the bulk actions, Clear). Bulk dialogs are `FormModal`s keyed by the selection (`key={ids.join()}`) so each opening binds the current ids (`tagMediaAction.bind(null, ids)`); `onSuccess` clears the selection. Bulk deletes go through `ConfirmDialog` with the count in the title. Bulk actions take ≤ 100 ids (checked in the action).
- **Reorderable grids (see the Media grid).** Order is a global `position` (0-based, contiguous) stored on each item, not a per-page index, so moving works from any page and filter. `useOptimistic` over the page's items applies `{ id, to }`, then the action (`moveMediaAction(id, toIndex)`) saves and `refresh()`es. Drag (a handle, native HTML5) is offered only when the list is unfiltered, where a page is a contiguous slice; with filters on, hide the handles and say why. Every item's "…" menu (`StatusMenu kind="actions"`: Move earlier, Move later, Move to start) is the keyboard/touch path and works everywhere. Announce each move ("<name> moved to position 3 of 29.") in an `aria-live="polite"` region.
- **Settings: a layout with tab routes.** `app/[locale]/dashboard/settings/layout.tsx` renders the title, subtitle and tab bar; each tab is its own route (`/settings` = Kennel profile, `/settings/account`, `/settings/notifications`, `/settings/verification`) with its own `page.tsx` and `loading.tsx` (`SettingsSkeleton`). The tab bar (`SettingsTabs`) is a `nav` of links; its only client part is `useSelectedLayoutSegment()` for `aria-current="page"` (null = the index tab). It wraps instead of scrolling. The sidebar's Settings item covers all sub-routes. Add a tab = a route folder + one entry in the layout's `tabs`. A screen with several independent sections uses **separate forms** (one Server Action and one result each), never one Save for everything.
- **The mock never performs irreversible or external effects.** Account deletion, password changes and email sending are validated for real but not carried out: the function returns `ok` and the UI says so plainly ("Preview only: … Nothing was deleted.", "Email sending isn't set up yet, so copy the link…"). Never show a success message that claims something happened when it didn't. Document what the real version must do in `ENDPOINTS.md`.
- **Dev-only preview params.** To view every state of a screen backed by a status (Verification), the page may pass `?state=…` to the data function, which honors it only when `process.env.NODE_ENV !== "production"` and puts the mock store in that state (so the screen's actions work from it). Mark the code `DEV-ONLY TESTING AID` and list it in `ENDPOINTS.md` as something to delete with the mock. Test these in `next dev`; production builds ignore them.
- **Small helpers.** `useFocusFirstError(formRef, state)` (`components/dashboard/ui/`) moves focus to the first invalid control after a failed submit. `Toggle` takes `stateLabels={{ on, off }}` to write the state as text next to the switch. `PageLink` is the Previous/Next link for URL pagination. Shared validation bits (`EMAIL_PATTERN`, `textField`, `rawField`) live in `lib/dashboard/validation/common.ts`. One form with two submit buttons (`name="intent" value="send|link"`, see the review invite card) beats two forms when both act on the same fields.
- **Breadcrumb slot.** The dashboard layout renders the `@breadcrumb` parallel route in the top bar's left slot (on mobile it replaces the wordmark and truncates). A page gets a breadcrumb by adding `app/[locale]/dashboard/@breadcrumb/<same path>/page.tsx` that renders `<Breadcrumb items={…} />`. `@breadcrumb/default.tsx`, `page.tsx` and `[...rest]/page.tsx` render nothing; the catch-all is required, because without it client-side navigation keeps showing the previous page's breadcrumb.
- **`Notice`.** A dismissible, `aria-live="polite"` banner. For one-time messages after a redirect, pass `?notice=<key>` and render `<Notice clearParam="notice">`, so dismissing removes the param and a reload doesn't show it again. Extra params that belong to the notice (e.g. `&added=3`) go in an array: `clearParam={["notice", "added"]}`.
- **`ImageUploader`.** Wraps the Cloudinary upload widget (existing unsigned preset `kennel_app_preset`, images only) and calls `onUpload({ url, fileName, width, height })` once per file, then `onQueueEnd()` once the batch is done (save the whole batch there, as Media does). `formats` limits file types (e.g. `["jpg", "jpeg", "png", "webp"]`). It always calls the latest callbacks through refs, because the widget keeps the callbacks it was created with. Each instance mounts its own widget iframe. Uploaded URLs are saved through `lib/dashboard`, never written directly.

### 6. Environment Variables

- Keep server secrets (Database URL, Cloudinary Secret) hidden.
- Any variable that must be read by a Client Component MUST be prefixed with `NEXT_PUBLIC_`.

### 7. Internationalization (i18n)

- **Source of truth language:** English (`en`). Every string is written in English first, then translated — never the reverse, and never mixed languages in the same component.
- **Library:** `next-intl`, using the App Router's path-based locale strategy (`app/[locale]/...`).
- **Supported locales (launch):** `en` (default, US) and `pt-BR` (Brazil).
- **Detection & persistence:** Middleware reads the `Accept-Language` header to pick a locale on first visit, then persists the choice in a cookie (`NEXT_LOCALE`) so it's sticky across sessions. Users can always override via a visible locale switcher.
- **No hardcoded UI strings:** Every user-facing string in a component goes through `useTranslations()` (client) or `getTranslations()` (server) and lives in `messages/en.json` / `messages/pt-BR.json`. This includes button labels, placeholders, empty states, and error messages returned from API routes that get rendered to the user.
- **Translation key structure:** Namespace keys by feature/route, not by component, e.g. `dashboard.dogs.addModal.title`, `public.kennels.emptyState.heading`. This keeps keys stable even as components get refactored.
- **Database content is not translated at launch:** Kennel names, descriptions, and dog names are user-generated content and stay as entered — only platform UI chrome is localized for v1.
- **`<html lang>` must reflect the active locale** dynamically in the root layout, not be hardcoded to `"en"`.

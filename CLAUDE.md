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
  - Status, ink on tint: `status-green` #166534 / `status-green-bg` #DCFCE7 (`status-green-solid` #16A34A for filled checks); `status-amber` #92400E / `-bg` #FEF3C7; `status-blue` #1E40AF / `-bg` #DBEAFE; `status-pink` #9D174D / `-bg` #FCE7F3; `status-red` #B91C1C / `status-red-strong` #DC2626 / `-bg` #FEF2F2.
  - Placeholder gradient: `sand-light` #E8D9C0 → `sand-dark` #C9A063.
- **Fonts.** Two fonts, loaded with `next/font` (`lib/fonts.ts`) and applied only in the dashboard layout (`dashboardFontClasses`): `font-display` (Playfair Display) for headings and big numbers, `font-body` (Work Sans) for everything else.
- **Shapes.** Cards `rounded-2xl`, controls `rounded-xl`, pills `rounded-full`.
- **Building blocks.** Use the primitives in `components/dashboard/ui/` (Button, Card, Badge, PageHeader, ProgressBar, EmptyState) before writing new markup.
- **Data.** Dashboard pages and components read and write only through the async functions in `lib/dashboard/*.ts`, never Prisma and never `lib/dashboard/mock/` directly. Each function's backend contract is listed in `lib/dashboard/ENDPOINTS.md`; keep it updated when adding functions.
- **Forms (dashboard pattern, see Dog-Edit).**
  - The page is a Server Component; the `<form action={formAction} noValidate>` lives in a small Client Component that uses `useActionState(serverAction, initialState)`. Bind ids on the server (`saveDogAction.bind(null, dog.id)`) and pass the bound action down; never trust an id from a form field.
  - Inputs are uncontrolled (`defaultValue`), with no `useState` per input. The action returns the submitted `values` and the form remounts its fields with a `submission` counter (`key={state.submission}`), because React resets uncontrolled fields after an action and applies a `<select>`'s `defaultValue` only on mount.
  - Composite controls (segmented choices, photo/document managers) keep local state and submit through native or hidden inputs (`SegmentedControl` uses real radios; managers render one hidden input per item). When React state changes a hidden input, call `notifyFormChange(el)` so `SaveBar` notices.
  - Validation runs on the server in hand-written functions (`lib/dashboard/validation/*`): parse `FormData` into an explicit typed input (whitelist; never spread raw input), validate, and return errors as translation keys + params (`dashboard.common.errors.*`). The UI translates them, shows them inline via `Field` (`aria-describedby` / `aria-invalid`), and moves focus to the first error.
  - `SaveBar` (sticky) shows "unsaved changes" by comparing serialized `FormData` to a baseline, warns on `beforeunload`, and shows "All changes saved" after an edit. Create redirects to the list with `?notice=…`.
  - Primitives in `components/dashboard/ui/`: `Field`, `TextInput`, `Textarea` (counter), `Select`, `SegmentedControl`, `Toggle`, `SaveBar`, `Notice`, `ConfirmDialog` (native `<dialog>`), `ImageUploader`.
- **Breadcrumb slot.** The dashboard layout renders the `@breadcrumb` parallel route in the top bar's left slot (on mobile it replaces the wordmark and truncates). A page gets a breadcrumb by adding `app/[locale]/dashboard/@breadcrumb/<same path>/page.tsx` that renders `<Breadcrumb items={…} />`. `@breadcrumb/default.tsx`, `page.tsx` and `[...rest]/page.tsx` render nothing; the catch-all is required, because without it client-side navigation keeps showing the previous page's breadcrumb.
- **`Notice`.** A dismissible, `aria-live="polite"` banner. For one-time messages after a redirect, pass `?notice=<key>` and render `<Notice clearParam="notice">`, so dismissing removes the param and a reload doesn't show it again.
- **`ImageUploader`.** Wraps the Cloudinary upload widget (existing unsigned preset `kennel_app_preset`, images only) and calls `onUpload({ url, fileName })` once per file. It always calls the latest callback through a ref, because the widget keeps the callbacks it was created with. Uploaded URLs are saved through `lib/dashboard`, never written directly.

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

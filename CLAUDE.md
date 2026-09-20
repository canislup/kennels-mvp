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
- **Color Palette:**
  - Neutrals: `slate-50` through `slate-900`.
  - Primary Action/Brand: `indigo-600` (hover: `indigo-700`).
  - Destructive: `red-50` background, `red-600` text.
- **Shapes & Shadows:** Use generous border radiuses (`rounded-xl`, `rounded-2xl`) and soft shadows (`shadow-sm`, `shadow-md`).

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

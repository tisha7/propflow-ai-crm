# Checkpoint log

This file is updated at the end of every checkpoint per the project's build
strategy: inspect, build, verify, report, stop.

## Checkpoint 1 — Application shell ✅

**Scope:** repo/schema inspection, Next.js initialization, design tokens,
global layout, navigation shell, placeholder routes. No auth, no database
connection, no migrations.

**What was created:**

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 scaffold
- Design token system (`app/globals.css`) — see `docs/design-system.md`
- UI primitives: `Button`, `Badge`, `Card`, `Avatar`, `Input`, `Skeleton`,
  `EmptyState`
- Layout: `Sidebar`, `Topbar`, `MobileNav`, `AppShell`, `PageHeader`,
  `ModulePlaceholder`
- 11 placeholder routes under `app/(app)/`, each labeled with the
  checkpoint that will implement it: dashboard, leads, pipeline,
  properties, follow-ups, appointments, ai-assistant, analytics, team,
  settings, help
- `README.md`, `docs/design-system.md`, `.env.example`

**Verification:**

- `tsc --noEmit` — clean
- `npm run build` — succeeds, all 12 routes prerender as static
- `eslint` — clean
- Production server smoke test — `/dashboard` and `/leads` return HTTP 200

**Deviation from spec (and why):** `next/font/google` requires a live
fetch to `fonts.googleapis.com`, which isn't reachable from the build
sandbox. Switched to the `geist` npm package (Vercel's official
self-hosted Geist / Geist Mono) — same fonts, no runtime fetch, works
identically on Vercel.

**Not done (intentionally, out of scope for this checkpoint):** no
Supabase client, no generated database types, no auth, no data fetching,
no migrations. The full schema (provided separately) is documented for
reference but not yet wired into code.

**Remaining issues:** none blocking. Topbar's search / quick add /
notifications / profile menu are visually present but inert — they're
wired to real behavior once the modules they depend on exist (auth in
Checkpoint 2, leads in Checkpoint 3, etc.), and are called out here so it's
clear that's intentional rather than an oversight.

**Next checkpoint:** Checkpoint 2 — authentication, organization
onboarding, admin profile, protected routes.

---

## Checkpoint 2 — Authentication & onboarding

_Not started._

# PropFlow

**AI-Powered Real Estate Sales CRM**

PropFlow is a B2B SaaS platform for real estate agencies and sales teams. It
helps organizations capture, qualify, and prioritize leads; manage sales
pipelines, properties, follow-ups, and appointments; and use AI for lead
scoring, summarization, and sales intelligence.

> **Status:** Checkpoint 1 (application shell) complete. See
> [`docs/checkpoints.md`](docs/checkpoints.md) for the full build log.

## Features

- Lead capture, qualification, scoring, and assignment
- Kanban sales pipeline (New -> Contacted -> Qualified -> Property Matched ->
  Site Visit -> Negotiation -> Won / Lost)
- Property inventory and rule-based lead-to-property matching
- Follow-up and appointment scheduling
- Deal tracking and revenue reporting
- AI lead scoring, lead summaries, and draft follow-up messages (human
  review required before sending - nothing is sent automatically)
- CRM-aware AI assistant for natural-language questions about the pipeline
- Lead, sales, team, and property analytics
- Multi-currency, multi-timezone, organization-level settings
- Role-based access for Admin, Manager, and Agent, enforced in both the UI
  and the database (Row Level Security)

## Architecture

```text
app/
  (app)/              route group for every authenticated module,
                       wrapped in the shared AppShell
    dashboard/
    leads/
    pipeline/
    properties/
    follow-ups/
    appointments/
    ai-assistant/
    analytics/
    team/
    settings/
    help/
  layout.tsx           root layout: fonts, metadata
  page.tsx              redirects "/" to "/dashboard"
  globals.css           design tokens (colors, radius, shadows, type)

components/
  ui/                  reusable primitives (Button, Badge, Card, Avatar,
                       Input, Skeleton, EmptyState)
  layout/              Sidebar, Topbar, MobileNav, AppShell, PageHeader,
                       ModulePlaceholder

lib/
  utils.ts              cn() class-merge helper
  nav-config.ts         single source of truth for sidebar navigation

docs/
  design-system.md      token reference
  checkpoints.md         build log, updated at the end of every checkpoint
```

Server components are used by default; anything interactive (the sidebar's
active-route highlighting, the mobile nav drawer, the topbar) is marked
`"use client"` explicitly and kept as small as possible.

## Technology stack

| Layer      | Choice                                   |
|------------|-------------------------------------------|
| Frontend   | Next.js (App Router), TypeScript          |
| Styling    | Tailwind CSS v4, hand-rolled shadcn-style primitives (`class-variance-authority`, `tailwind-merge`) |
| Fonts      | Geist Sans / Geist Mono, self-hosted via the `geist` npm package |
| Backend    | Supabase (PostgreSQL, Auth, Storage, Row Level Security) |
| AI         | Server-side only - API key never exposed to the client |
| Deployment | Vercel                                    |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + AI credentials
npm run dev
```

The app currently redirects `/` -> `/dashboard`. Every module route renders
as a labeled placeholder until its checkpoint lands (see
[`docs/checkpoints.md`](docs/checkpoints.md)) - this is expected; no
functionality has been wired up yet beyond navigation and layout.

## Environment variables

See [`.env.example`](.env.example).

| Variable | Where it's used | Notes |
|----------|------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Public - safe to expose |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | Public - safe to expose, RLS enforces access control |
| `AI_API_KEY` | server only | Never referenced with the `NEXT_PUBLIC_` prefix; all AI calls happen in server actions / route handlers |

## Database

PropFlow uses an existing, already-provisioned Supabase project as the
source of truth. The application code does not create, drop, or rename
tables, and does not weaken Row Level Security. See
[`docs/checkpoints.md`](docs/checkpoints.md) for exactly which checkpoint
introduces the Supabase client and generated types.

Core tables (already provisioned, tenant-isolated by `organization_id` via
RLS): `organizations`, `profiles`, `leads`, `properties`,
`lead_properties`, `activities`, `follow_ups`, `appointments`, `deals`,
`ai_analyses`.

Tenant isolation model: `authenticated user -> profile -> organization_id ->
records scoped to that organization`.

## Security

- No secret keys are ever placed in client-side code or `NEXT_PUBLIC_`
  variables.
- Privileged operations (AI calls, cross-tenant admin actions) run
  server-side only.
- Role permissions (Admin / Manager / Agent) are enforced at the UI layer
  and, from Checkpoint 2 onward, at the database layer via RLS - the UI is
  never the only gate.
- Organization IDs are never trusted from client input for authorization
  decisions.

## AI features (planned - Checkpoints 6-7)

- **Lead scoring** - 0-100 score with priority (cold/warm/hot) and a
  plain-language rationale, persisted to `ai_analyses`
  (`analysis_type = lead_scoring`).
- **Lead summary** - on-demand natural-language summary of a lead's
  requirements and activity.
- **Follow-up message drafting** - generates an email or WhatsApp-style
  draft; a human always reviews and sends it manually, nothing is
  auto-sent.
- **AI Assistant** - answers natural-language questions about the
  pipeline using real application data, with links back to the records
  referenced.

## Deployment

Target platform is Vercel. Set the environment variables above in the
Vercel project settings before deploying; nothing in this repo assumes a
specific hosting provider beyond that.

## Demo data

Seed/demo data (organization: PrimeNest Realty; example agents and leads)
will be clearly labeled as demo data wherever it appears in the UI - it is
never presented as if it were a real customer's data.

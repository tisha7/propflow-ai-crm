# Design system

PropFlow's visual language is deliberately narrow: paper-and-ink neutrals,
one saturated brand color, and a strict rule that amber is used only for
AI-originated content. All tokens live as CSS custom properties in
`app/globals.css` and are exposed to Tailwind via `@theme inline`.

## Signature: tabular data typography

Every number that represents money, a lead score, a match percentage, or a
measurement is set in Geist Mono with tabular figures, using the
`.font-tabular` utility class (or `font-mono` + `tabular-nums` directly).
This is the one deliberate typographic signature of the product — it reads
like a ledger, which fits a product whose job is to make sales numbers
trustworthy and scannable. Interface copy (labels, nav, body text) always
stays in Geist Sans.

```tsx
<span className="font-tabular text-[20px] font-semibold text-ink-900">
  $850,000
</span>
```

## Color

| Token | Hex | Use |
|---|---|---|
| `--canvas` | `#F6F7F9` | App background |
| `--surface` | `#FFFFFF` | Cards, panels, table rows |
| `--surface-sunken` | `#FAFBFC` | Table headers, recessed areas |
| `--border` / `--border-strong` | `#E5E8EC` / `#D6DAE1` | Hairlines, input borders |
| `--ink-900` … `--ink-300` | `#12151C` → `#C1C6CE` | Text, from primary to disabled |
| `--brand-500` | `#2C4CDB` | Primary actions, active nav, links |
| `--signal-500` | `#B4791F` | **Reserved exclusively for AI-generated content** — insight cards, AI badges, AI-authored copy |
| `--success-500` / `--warning-500` / `--error-500` / `--info-500` | | Semantic states |
| `--priority-hot` / `--priority-warm` / `--priority-cold` | `#C0362C` / `#B7791F` / `#3C6FC4` | Lead temperature |

The amber/signal color must never be used for anything a human authored —
it is the one color in the system whose sole job is to tell a user "AI made
this," so it has to stay rare and consistent to keep that meaning.

## Type scale

| Role | Size | Weight |
|---|---|---|
| Display | 32px | 600 |
| Page title | 22–28px | 600 |
| Section title | 20px | 600 |
| Body | 13–14px | 400/500 |
| Secondary / caption | 12–13px | 400 |
| Tabular data | varies | 500/600, Geist Mono |

## Spacing

4, 8, 12, 16, 20, 24, 32, 40, 48, 64 — Tailwind's default scale, used as-is.

## Radius

| Token | Value | Use |
|---|---|---|
| `--radius-control` | 8px | Buttons, inputs, small chips |
| `--radius-card` | 12px | Cards |
| `--radius-panel` | 16px | Large panels, modals |

## Elevation

Borders carry most of the visual separation; shadows (`--shadow-xs` /
`--shadow-sm` / `--shadow-md` / `--shadow-popover`) are reserved for
floating elements (dropdowns, modals) and are kept subtle everywhere else.

## Layout

- Sidebar: 248px expanded (`--sidebar-width`), collapses to an off-canvas
  drawer under the `lg` breakpoint.
- Header: 60px (`--header-height`), sticky, blurred backdrop.
- Content max width: 1400px, centered.

## Components

Primitives live in `components/ui/` and are intentionally minimal
(no Radix dependency yet): `Button`, `Badge`, `Card`, `Avatar`, `Input`,
`Skeleton`, `EmptyState`. Layout composition lives in `components/layout/`:
`Sidebar`, `Topbar`, `MobileNav`, `AppShell`, `PageHeader`,
`ModulePlaceholder`.

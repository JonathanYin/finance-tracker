<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

Context for AI agents working in this repo. `CLAUDE.md` just imports this file
(`@AGENTS.md`), so this is the single source of truth — edit only this one and
both Claude Code and other agents stay in sync.

## What this is

A personal finance tracker. The MVP lets you add / edit / delete expenses and
recurring subscriptions. Signed-out users persist data in the browser via
`localStorage`; signed-in users persist data through Supabase Auth + Supabase
Postgres with Row Level Security. Single client-rendered dashboard page.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4 (configured via `@theme` in `app/globals.css`, no JS config)
- Runtime dependencies are intentionally light: the framework plus Supabase for
  account-backed persistence. Use native `Intl` and `crypto.randomUUID`.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (also runs typecheck + lint; the canonical
  green check before considering work done)
- `npm run lint` — ESLint

## Architecture

State lives in a React Context backed by a swappable storage layer, so future
data sources slot in behind the same interface without touching components.

```
app/
  layout.tsx            # metadata + wraps children in <ExpensesProvider>
  page.tsx              # "use client" dashboard; holds `editing` state
  globals.css           # design tokens (see Design) + Tailwind import
components/
  SummaryHeader.tsx     # total / this-year / this-month + by-category breakdown
  AccountControl.tsx    # guest / sign-in / sign-up / sign-out UI
  ExpenseForm.tsx       # shared add + edit form
  ExpenseList.tsx       # list sorted by date desc
  ExpenseItem.tsx       # one row (details + Edit/Delete)
  SubscriptionsSummary.tsx # subscription run-rate and next-charge summary
  SubscriptionForm.tsx  # add + edit subscription
  SubscriptionList.tsx  # subscription rows
lib/
  types.ts              # Expense, ExpenseInput, Category, ExpenseSource, ExpenseStore
  categories.ts         # preset CATEGORIES + shared BADGE_CLASS
  storage.ts            # localStorage + Supabase stores
  supabase/             # client/server/proxy helpers for Supabase sessions
  format.ts             # formatCurrency / formatDate / todayISO
  expenses-context.tsx  # ExpensesProvider + useExpenses() hook
  README.md             # data-layer extension notes (READ before changing the model)
supabase/
  schema.sql            # tables, indexes, and RLS policies
```

Data flow: components call `useExpenses()` → mutations update state and persist
through the active store. Guest mode uses `localStorageStore`; signed-in mode
uses Supabase stores and imports local guest data once per user. Every expense
gets `id`, `createdAt`, and a `source` field (`"manual"` today) on create.

## Conventions & gotchas

- All interactive components are `"use client"`. `localStorage` access is
  SSR-guarded (`typeof window !== "undefined"`); the provider hydrates in a
  `useEffect`, never during render — preserve this to avoid hydration mismatch.
  There's a `hydrated` flag; the page shows a loading state until it's true.
- Dates are ISO `yyyy-mm-dd` strings, parsed as local time in `format.ts` to
  avoid UTC off-by-one. Use `todayISO()` for defaults.
- Account-backed persistence needs `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `supabase/schema.sql` applied in
  Supabase. If env vars are missing, the app stays in guest mode.
- Never put Supabase secret/service-role keys in client code. Browser writes
  rely on RLS policies scoped to `auth.uid() = user_id`.
- Match the existing style: Tailwind utility classes only, tokens over raw
  colors (e.g. `text-ink`, `bg-canvas`, `border-hairline`).

## Design

The UI follows `DESIGN.md` (a Vercel-inspired ink-on-canvas system). Read it
before building any new UI. Tokens are defined in `app/globals.css` via
`@theme`. Essentials:

- Surfaces: `canvas` / `canvas-soft`; text: `ink` / `body` / `mute`; lines:
  `hairline`. Elevation is the stacked `shadow-card` / `shadow-float` — never a
  single heavy drop-shadow.
- In-app controls use the 6px radius (`rounded-sm`), not the marketing pill.
- Mono (`font-mono`, Geist Mono) is the technical voice — used for numbers and
  the uppercase summary labels. Body copy is never mono.
- Restraint: no extra accent colors. Category badges are neutral
  (`BADGE_CLASS`), distinguished by label, not hue. Single ink primary button.

## Roadmap / not yet built

Future direction — see `lib/README.md` for the detailed model implications:

- **Bank integrations (Schwab, BofA)** and **email/receipt parsing** to
  auto-create transactions. These need a server (API routes + OAuth / an
  aggregator, or server-side parsing) — not possible purely client-side. New
  sources set their own `source` value; de-dup on `source` + amount + date.
- **Income & savings**: salary (a BofA inflow) and Schwab deposits (transfers to
  savings) don't fit the expense/outflow shape. Plan is to add
  `type: "expense" | "income" | "transfer"` (rename `Expense` → `Transaction`)
  so summary math can split spend / income / saved / net.

## Constraints

- Don't introduce a hosting/deploy step or recommend a host without asking; this
  runs locally via `npm run dev` for now.
- Keep the MVP dependency-light and the storage layer behind `ExpenseStore` /
  `SubscriptionStore`.

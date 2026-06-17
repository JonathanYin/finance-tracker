<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

Context for AI agents working in this repo. `CLAUDE.md` just imports this file
(`@AGENTS.md`), so this is the single source of truth — edit only this one and
both Claude Code and other agents stay in sync.

## What this is

A personal finance tracker. The MVP lets you add / edit / delete expenses,
income records, Schwab savings transfers, and recurring subscriptions,
persisted in the browser via `localStorage`. No backend, database, or auth.
Single client-rendered page.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4 (configured via `@theme` in `app/globals.css`, no JS config)
- No runtime dependencies beyond the framework — uses native `Intl` and
  `crypto.randomUUID`. Do not add libraries without a clear need.

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
  SummaryHeader.tsx     # expense totals + by-category breakdown
  ExpenseForm.tsx       # shared add + edit form
  ExpenseList.tsx       # list sorted by date desc
  ExpenseItem.tsx       # one row (details + Edit/Delete)
  CashflowSummary.tsx   # monthly income / projected out / saved / remaining
  CashflowForm.tsx      # add + edit income or savings transfer
  CashflowList.tsx      # monthly income + savings records
  SubscriptionsSummary.tsx # subscription run-rate and next-charge summary
  SubscriptionForm.tsx  # add + edit subscription
  SubscriptionList.tsx  # subscription rows
lib/
  types.ts              # Transaction, Expense, Subscription, inputs, stores
  categories.ts         # preset categories/destinations + shared BADGE_CLASS
  storage.ts            # localStorage stores for transactions + subscriptions
  format.ts             # formatCurrency / formatDate / todayISO
  expenses-context.tsx  # ExpensesProvider + useExpenses() hook
  README.md             # data-layer extension notes (READ before changing the model)
```

Data flow: components call `useExpenses()` → mutations update state and persist
through the storage layer. Transactions live in
`finance-tracker:transactions`; legacy `finance-tracker:expenses` data is read
and migrated into transactions non-destructively. Subscriptions live in
`finance-tracker:subscriptions`. Every transaction gets `id`, `createdAt`, and a
`source` field (`"manual"` today) on create.

## Conventions & gotchas

- All interactive components are `"use client"`. `localStorage` access is
  SSR-guarded (`typeof window !== "undefined"`); the provider hydrates in a
  `useEffect`, never during render — preserve this to avoid hydration mismatch.
  There's a `hydrated` flag; the page shows a loading state until it's true.
- Dates are ISO `yyyy-mm-dd` strings, parsed as local time in `format.ts` to
  avoid UTC off-by-one. Use `todayISO()` for defaults.
- The primary cashflow model is `Transaction` with
  `type: "expense" | "income" | "savings_transfer"`. Expenses are exposed as a
  filtered compatibility view for the spending UI.
- Cashflow is month-based. It sums dated income/expense/savings records and
  subtracts projected subscription charges expected to bill in the selected
  month. Because overdue subscriptions are advanced on load, subscription
  projection is intended for current/future months rather than reconstructing
  historical billed months.
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
- The main page is a restrained dashboard shell (`max-w-6xl`): summary spans the
  top, lists sit in the main column, and add/edit forms sit in a 360px right rail
  on desktop. Mobile stays stacked as summary → form → list.

## Roadmap / not yet built

Future direction — see `lib/README.md` for the detailed model implications:

- **Bank integrations (Schwab, BofA)** and **email/receipt parsing** to
  auto-create transactions. These need a server (API routes + OAuth / an
  aggregator, or server-side parsing) — not possible purely client-side. New
  sources set their own `source` value; de-dup on `source` + amount + date.
- **Recurring income**: income is manual dated records today. A future recurring
  income setup could mirror subscriptions, but do not treat annual salary as a
  single cashflow entry unless the user explicitly asks for that behavior.

## Constraints

- Don't introduce a hosting/deploy step or recommend a host without asking; this
  runs locally via `npm run dev` for now.
- Keep the MVP dependency-light and the storage layer behind `TransactionStore`
  / `SubscriptionStore`.

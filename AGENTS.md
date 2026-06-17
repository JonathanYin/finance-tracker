<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

Context for AI agents working in this repo. `CLAUDE.md` just imports this file
(`@AGENTS.md`), so this is the single source of truth — edit only this one and
both Claude Code and other agents stay in sync.

## What this is

A personal finance tracker. It now tracks transactions, not only expenses:
spend, income, and transfers/savings are separate record types. The original
browser `localStorage` MVP data is imported once into a local backend JSON store.
There is still no auth or hosted database.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4 (configured via `@theme` in `app/globals.css`, no JS config)
- No runtime dependencies beyond the framework — uses native `Intl`, `fetch`,
  Node file APIs, Node crypto, and `crypto.randomUUID`. Do not add libraries
  without a clear need.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (also runs typecheck + lint; the canonical
  green check before considering work done)
- `npm run lint` — ESLint

## Architecture

State lives in a React Context backed by App Router API routes and a local
server-side JSON store. Provider integrations slot in through route handlers,
then normalize into the shared `Transaction` model.

```
app/
  layout.tsx            # metadata + wraps children in <ExpensesProvider>
  page.tsx              # "use client" dashboard; holds `editing` state
  api/                  # transactions + import/integration route handlers
  globals.css           # design tokens (see Design) + Tailwind import
components/
  SummaryHeader.tsx     # spend / income / saved + by-category spend
  IntegrationsPanel.tsx # Plaid, receipt upload, Gmail configuration surface
  ExpenseForm.tsx       # shared add + edit transaction form
  ExpenseList.tsx       # list sorted by date desc
  ExpenseItem.tsx       # one row (details + Edit/Delete)
lib/
  types.ts              # Transaction model + source/account/import metadata
  server-store.ts       # .finance-tracker-data/finance.json persistence
  server-crypto.ts      # AES-GCM token encryption
  plaid.ts              # Plaid Link/exchange/sync helpers
  categories.ts         # preset CATEGORIES + shared BADGE_CLASS
  storage.ts            # legacy localStorage reader for one-time migration
  format.ts             # formatCurrency / formatDate / todayISO
  expenses-context.tsx  # ExpensesProvider + useExpenses() hook
  README.md             # data-layer notes (READ before changing the model)
```

Data flow: components call `useExpenses()` -> `/api/transactions` route handlers
-> `server-store.ts`. Every transaction has `type`, `source`, `reviewStatus`,
timestamps, and optional provider identifiers for de-duplication.

## Conventions & gotchas

- All interactive components are `"use client"`. Legacy `localStorage` access is
  SSR-guarded and only used during provider hydration for one-time migration.
  Preserve the `hydrated` flag so the page does not render before API data loads.
- Dates are ISO `yyyy-mm-dd` strings, parsed as local time in `format.ts` to
  avoid UTC off-by-one. Use `todayISO()` for defaults.
- Keep amounts positive; `type: "expense" | "income" | "transfer"` defines
  summary behavior.
- Plaid access tokens must only be stored encrypted with `FINANCE_TRACKER_SECRET`.
  Do not put provider tokens or local `.finance-tracker-data` contents in git.
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

- **Plaid production hardening:** institution naming, webhook verification,
  cursor persistence, re-auth/update mode, and investment transaction coverage.
- **Receipt OCR:** the upload route creates reviewable drafts; wire Google
  Document AI `EXPENSE_PROCESSOR` once credentials and processor config exist.
- **Gmail receipts:** add Google OAuth, token storage, manual sync, then Pub/Sub
  watch renewal. `gmail.readonly` is restricted and may require Google review.

## Constraints

- Don't introduce a hosting/deploy step or recommend a host without asking; this
  runs locally via `npm run dev` for now.
- Keep the app dependency-light. Prefer native platform APIs until a dependency
  removes real integration complexity.

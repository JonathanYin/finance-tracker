# Data layer

The app supports two persistence modes:

- **Guest mode:** expenses and subscriptions persist in `localStorage`.
- **Signed-in mode:** Supabase Auth identifies the user, and Supabase Postgres
  stores rows protected by Row Level Security.

The React components stay behind the context/store boundary, so the UI does not
need to know whether data is local or cloud-backed.

## Shape

- `types.ts` — expense/subscription domain types and persistence interfaces.
- `storage.ts` — localStorage stores plus Supabase-backed stores.
- `expenses-context.tsx` — auth/session detection, one-time guest import, state,
  and mutation methods.
- `supabase/` — browser/server/proxy helpers for Supabase SSR sessions.
- `categories.ts`, `format.ts` — preset categories and display helpers.

## Account-backed persistence

Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then run `supabase/schema.sql` in the
Supabase SQL editor. When a user signs up or signs in, local guest records are
upserted into that account once and marked with
`finance-tracker:cloud-imported:<userId>` in localStorage.

Supabase tables include a `user_id` column and RLS policies requiring
`auth.uid() = user_id` for select/insert/update/delete. Do not bypass this by
using secret keys in client code.

## Extending to bank / email / receipt sources

Every expense carries a `source` field (`"manual"` today). Imported expenses set
their own source (`"schwab" | "bofa" | "email" | "receipt"`), which keeps them
distinguishable and gives de-dup logic a key.

- **Bank integrations (Schwab, BofA):** require server-side OAuth or an
  aggregator. Imported records should normalize into the same expense shape and
  persist through the Supabase store for signed-in users.
- **Email / receipt parsing:** parse server-side into `ExpenseInput`, then use
  the same add path. De-dup on `source` + `merchant` + `amount` + `date`.

## Beyond expenses: income & savings

Income and transfers are not implemented in this branch. Adding them should
change the model deliberately, likely from `Expense` to a broader
`Transaction` shape with a discriminator such as
`type: "expense" | "income" | "transfer"`.

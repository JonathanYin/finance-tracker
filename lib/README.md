# Data layer

The MVP keeps all expense data client-side in `localStorage`. The pieces here
are deliberately structured so future integrations slot in without a rewrite.

## Shape

- `types.ts` — `Expense`, `ExpenseInput`, `Category`, `ExpenseSource`, and the
  `ExpenseStore` persistence interface.
- `storage.ts` — `localStorageStore`, the only `ExpenseStore` implementation today.
- `expenses-context.tsx` — `ExpensesProvider` / `useExpenses()` hold state and
  fan every mutation out to the store.
- `categories.ts`, `format.ts` — preset categories and display helpers.

## Extending to bank / email / receipt sources

Every expense carries a `source` field (`"manual"` today). Imported expenses set
their own source (`"schwab" | "bofa" | "email" | "receipt"`), which keeps them
distinguishable and gives de-dup logic a key.

- **New persistence backend** (e.g. an API + database): implement `ExpenseStore`
  (`apiStore`, `bankSyncStore`, …) and swap it into `expenses-context.tsx`. The
  components don't change.
- **Bank integrations (Schwab, BofA):** require a server. These can't be done
  purely client-side — they need API routes plus OAuth or an aggregator
  (Plaid-style). That work brings a backend; the imported transactions are then
  normalized into the `Expense` shape and persisted through the same store.
- **Email / receipt parsing:** a server-side ingestion step parses a message or
  uploaded file into `ExpenseInput`, then goes through the same add path.
  De-dup on `source` + `merchant` + `amount` + `date` to avoid double-counting a
  purchase that arrives via both an email and a bank feed.

## Beyond expenses: income & savings (future)

Today every record is an expense (an outflow with a positive `amount`). Two
planned features don't fit that shape and will need a transaction *direction*:

- **Salary / income from Bank of America** — a recurring *inflow*. Auto-detected
  from a BofA feed (a positive deposit, usually from the same payer each period).
- **Savings — deposits into Schwab** — a *transfer* out of checking into a
  savings/brokerage account. Not spending, but not income either; counting it as
  an expense would overstate spend, and ignoring it would lose the savings view.

Suggested model change when this lands: add a discriminator to the record, e.g.
`type: "expense" | "income" | "transfer"` (rename `Expense` → `Transaction`, keep
`ExpenseInput`/components keyed off `type`). Summary math then splits cleanly:

- spend = sum of `expense`
- income = sum of `income`
- saved = sum of `transfer` into a savings/brokerage account
- net = income − spend − saved (or income − spend, with saved shown separately)

`Category` stays meaningful for expenses; income/transfers can use their own
small label set (e.g. "Salary", "Savings"). Auto-classification: a BofA deposit
from a known employer → `income`; an outbound transfer to a linked Schwab
account → `transfer`. De-dup still keys on `source` + amount + date.

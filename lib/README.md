# Data layer

The MVP keeps all expense data client-side in `localStorage`. The pieces here
are deliberately structured so future integrations slot in without a rewrite.

## Shape

- `types.ts` — `Transaction`, `Expense`, input types, categories, sources, and
  persistence interfaces.
- `storage.ts` — localStorage-backed stores for transactions and subscriptions.
- `expenses-context.tsx` — `ExpensesProvider` / `useExpenses()` hold state and
  fan every mutation out to the store.
- `categories.ts`, `format.ts` — preset categories and display helpers.

Transactions are the primary cashflow record. Expenses are exposed as a filtered
compatibility view so the spending UI can stay focused while income and savings
use the broader model.

## Extending to bank / email / receipt sources

Every transaction carries a `source` field (`"manual"` today). Imported records set
their own source (`"schwab" | "bofa" | "email" | "receipt"`), which keeps them
distinguishable and gives de-dup logic a key.

- **New persistence backend** (e.g. an API + database): implement
  `TransactionStore` (`apiStore`, `bankSyncStore`, …) and swap it into
  `expenses-context.tsx`. The components don't change.
- **Bank integrations (Schwab, BofA):** require a server. These can't be done
  purely client-side — they need API routes plus OAuth or an aggregator
  (Plaid-style). That work brings a backend; the imported records are then
  normalized into the `Transaction` shape and persisted through the same store.
- **Email / receipt parsing:** a server-side ingestion step parses a message or
  uploaded file into `ExpenseInput`, then goes through the same add path.
  De-dup on `source` + `merchant` + `amount` + `date` to avoid double-counting a
  purchase that arrives via both an email and a bank feed.

## Income & savings

Income and savings transfers are stored as transaction types instead of being
forced into expenses:

- **Salary / income from Bank of America** — a recurring *inflow*. Auto-detected
  from a BofA feed (a positive deposit, usually from the same payer each period).
- **Savings — deposits into Schwab** — a *transfer* out of checking into a
  savings/brokerage account. Not spending, but not income either.

Summary math splits cleanly:

- spend = sum of `expense`
- projected subscription spend = subscriptions expected to bill in the selected month
- income = sum of `income`
- saved = sum of `savings_transfer`
- remaining = income - spend - projected subscription spend - saved

`Category` stays meaningful for expenses; income/transfers can use their own
small label set (e.g. "Salary", "Schwab"). Auto-classification: a BofA deposit
from a known employer -> `income`; an outbound transfer to a linked Schwab
account -> `savings_transfer`. De-dup still keys on `source` + amount + date.

# Data layer

The app has moved from MVP-only `localStorage` expenses to backend-backed
transactions. Browser `localStorage` is now treated as legacy data and is
imported once into the server store on first load.

## Shape

- `types.ts` — `Transaction`, `TransactionInput`, import/source metadata,
  connected-account metadata, and compatibility aliases for the old expense
  component names.
- `server-store.ts` — local backend persistence in
  `.finance-tracker-data/finance.json`, plus import de-duplication and basic
  imported-transaction classification.
- `server-crypto.ts` — AES-GCM helpers for encrypting provider access tokens
  with `FINANCE_TRACKER_SECRET`.
- `plaid.ts` — Plaid Link, token exchange, and transaction-sync helpers using
  native `fetch`.
- `expenses-context.tsx` — client state backed by `/api/transactions`, with
  one-time legacy `localStorage` migration.
- `storage.ts` — legacy MVP `localStorage` reader/writer kept only for browser
  migration.

## Transaction model

Records use positive `amount` values and a `type` discriminator:

- `expense` — spending
- `income` — salary / deposits
- `transfer` — savings or investment transfers, such as BofA to Schwab

Summaries split spend, income, and saved amounts instead of treating every
record as an outflow.

## Integrations

- **Plaid:** configured with `PLAID_CLIENT_ID`, `PLAID_SECRET`, and
  `FINANCE_TRACKER_SECRET`. Link/token exchange and manual sync routes are in
  `app/api/integrations/plaid/*`.
- **Receipt upload:** accepts file uploads and creates reviewable receipt
  drafts. Google Document AI wiring is intentionally left behind the route
  boundary until credentials and processor configuration are available.
- **Gmail:** currently returns a clear not-configured response. The next step is
  Google OAuth, token storage, and restricted-scope review for `gmail.readonly`.

## De-duplication

Provider IDs win when available (`source + sourceId`). Fallback matching uses
`source + sourceAccountId + date + amount + merchant/raw description`.

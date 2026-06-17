# Finance Tracker

A local personal finance tracker built with Next.js 16, React 19, TypeScript,
and Tailwind CSS v4.

The app tracks transactions across three types:

- `expense` for spending
- `income` for salary and deposits
- `transfer` for savings or investing transfers, such as BofA to Schwab

Transactions are stored locally in `.finance-tracker-data/finance.json`. The app
also supports browser-side migration from the original local expense store when
existing data is present.

## Features

- Add, edit, and delete transactions
- Track spend, income, saved/transferred money, yearly spend, and monthly spend
- Categorize spending with a small fixed category set
- Import bank activity through Plaid Link and transaction sync
- Upload receipt files and create reviewable receipt transactions
- Keep imported transactions distinguishable by source and provider IDs
- Reset local test data from the app while running in development

## Setup

Install dependencies:

```bash
npm install
```

Create a local env file:

```bash
cp .env.example .env.local
```

Fill in Plaid sandbox credentials from the Plaid dashboard:

```bash
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
FINANCE_TRACKER_SECRET=
```

Generate `FINANCE_TRACKER_SECRET` with:

```bash
openssl rand -base64 32
```

## Commands

```bash
npm run dev
npm run lint
npm run build
```

Open `http://localhost:3000` after starting the dev server.

## Integrations

Plaid is used for bank connections and transaction sync. Sandbox credentials are
enough to test the Link flow with Plaid test institutions. Real Bank of America
and Schwab accounts require Plaid Development or Production access.

Receipt upload accepts image and PDF files and creates reviewable transactions
from the merchant, amount, and date fields provided in the app.

Gmail receipt ingestion is represented in the UI, but requires Google OAuth,
restricted-scope approval for `gmail.readonly`, and token storage before it can
sync real email receipts.

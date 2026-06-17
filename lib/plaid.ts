import type { ConnectedAccount, ImportTransactionInput } from "./types";
import { decryptSecret, encryptSecret } from "./server-crypto";

const PLAID_PRODUCTS = ["transactions", "investments"] as const;

function plaidEnv() {
  return {
    clientId: process.env.PLAID_CLIENT_ID,
    secret: process.env.PLAID_SECRET,
    environment: process.env.PLAID_ENV ?? "sandbox",
  };
}

function plaidBaseUrl() {
  const { environment } = plaidEnv();
  if (environment === "production") return "https://production.plaid.com";
  if (environment === "development") return "https://development.plaid.com";
  return "https://sandbox.plaid.com";
}

export function isPlaidConfigured() {
  const env = plaidEnv();
  return Boolean(env.clientId && env.secret);
}

async function plaidRequest<T>(endpoint: string, body: Record<string, unknown>) {
  const env = plaidEnv();
  if (!env.clientId || !env.secret) {
    throw new Error("Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET.");
  }

  const response = await fetch(`${plaidBaseUrl()}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.clientId,
      secret: env.secret,
      ...body,
    }),
  });

  const json = (await response.json()) as T & { error_message?: string };
  if (!response.ok) {
    throw new Error(json.error_message ?? `Plaid request failed: ${endpoint}`);
  }
  return json;
}

export async function createPlaidLinkToken() {
  return plaidRequest<{ link_token: string }>("/link/token/create", {
    client_name: "Finance Tracker",
    country_codes: ["US"],
    language: "en",
    products: PLAID_PRODUCTS,
    user: {
      client_user_id: "personal-user",
    },
    transactions: {
      days_requested: 730,
    },
  });
}

export async function exchangePlaidPublicToken(publicToken: string) {
  const exchanged = await plaidRequest<{
    access_token: string;
    item_id: string;
  }>("/item/public_token/exchange", {
    public_token: publicToken,
  });

  const accounts = await plaidRequest<{
    accounts: Array<{
      account_id: string;
      name: string;
      mask?: string;
      type?: string;
      subtype?: string;
    }>;
    item: { institution_id?: string };
  }>("/accounts/get", {
    access_token: exchanged.access_token,
  });

  const encryptedAccessToken = encryptSecret(exchanged.access_token);
  const timestamp = new Date().toISOString();
  const connectedAccounts: ConnectedAccount[] = accounts.accounts.map((account) => ({
    id: `plaid_${account.account_id}`,
    provider: "plaid",
    institutionName: accounts.item.institution_id ?? "Plaid institution",
    accountName: account.name,
    accountMask: account.mask,
    accountType: account.type,
    accountSubtype: account.subtype,
    sourceAccountId: account.account_id,
    itemId: exchanged.item_id,
    encryptedAccessToken,
    syncCursor: null,
    status: "connected",
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  return connectedAccounts;
}

function merchantFromPlaid(transaction: PlaidTransaction) {
  return (
    transaction.merchant_name ??
    transaction.counterparties?.[0]?.name ??
    transaction.name ??
    ""
  );
}

function categoryFromPlaid(transaction: PlaidTransaction): ImportTransactionInput["category"] {
  const primary = transaction.personal_finance_category?.primary?.toLowerCase() ?? "";
  if (primary.includes("food") || primary.includes("dining")) return "Food";
  if (primary.includes("transport") || primary.includes("travel")) return "Transport";
  if (primary.includes("rent") || primary.includes("utilities")) return "Bills";
  if (primary.includes("medical")) return "Health";
  if (primary.includes("entertainment")) return "Entertainment";
  if (primary.includes("shopping") || primary.includes("general_merchandise")) {
    return "Shopping";
  }
  return "Other";
}

function isTransferLike(transaction: PlaidTransaction) {
  const text = `${transaction.name ?? ""} ${transaction.merchant_name ?? ""}`
    .toLowerCase()
    .trim();
  const primary = transaction.personal_finance_category?.primary?.toLowerCase() ?? "";
  const detailed =
    transaction.personal_finance_category?.detailed?.toLowerCase() ?? "";

  return (
    primary.includes("transfer") ||
    detailed.includes("transfer") ||
    text.includes("credit card") ||
    text.includes("payment") ||
    text.includes("online transfer") ||
    text.includes("ach") ||
    text.includes("deposit into") ||
    text.includes("withdrawal from")
  );
}

function isIncomeLike(transaction: PlaidTransaction) {
  const text = `${transaction.name ?? ""} ${transaction.merchant_name ?? ""}`
    .toLowerCase()
    .trim();
  const primary = transaction.personal_finance_category?.primary?.toLowerCase() ?? "";
  const detailed =
    transaction.personal_finance_category?.detailed?.toLowerCase() ?? "";

  return (
    primary.includes("income") ||
    detailed.includes("payroll") ||
    text.includes("payroll") ||
    text.includes("salary") ||
    text.includes("direct dep") ||
    text.includes("direct deposit") ||
    text.includes("interest")
  );
}

type PlaidTransaction = {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  datetime?: string;
  name?: string;
  merchant_name?: string;
  pending?: boolean;
  personal_finance_category?: { primary?: string; detailed?: string };
  counterparties?: Array<{ name?: string }>;
};

export async function syncPlaidItem(accounts: ConnectedAccount[]) {
  const account = accounts.find((candidate) => candidate.encryptedAccessToken);
  if (!account?.encryptedAccessToken) {
    return { inputs: [], nextCursor: accounts[0]?.syncCursor ?? null };
  }

  const accessToken = decryptSecret(account.encryptedAccessToken);
  let cursor = account.syncCursor ?? undefined;
  let hasMore = true;
  let nextCursor = account.syncCursor ?? null;
  const transactions: PlaidTransaction[] = [];

  while (hasMore) {
    const synced = await plaidRequest<{
      added: PlaidTransaction[];
      modified: PlaidTransaction[];
      removed: Array<{ transaction_id: string }>;
      next_cursor: string;
      has_more: boolean;
    }>("/transactions/sync", {
      access_token: accessToken,
      cursor,
      options: {
        include_original_description: true,
        personal_finance_category_version: "v2",
      },
    });

    transactions.push(...synced.added, ...synced.modified);
    cursor = synced.next_cursor;
    nextCursor = synced.next_cursor;
    hasMore = synced.has_more;
  }

  const inputs = transactions.map((transaction): ImportTransactionInput => {
    const isOutflow = transaction.amount > 0;
    const type = isTransferLike(transaction)
      ? "transfer"
      : !isOutflow || isIncomeLike(transaction)
        ? "income"
        : "expense";
    const merchant = merchantFromPlaid(transaction);
    return {
      amount: Math.abs(transaction.amount),
      date: transaction.date,
      postedAt: transaction.datetime,
      category: type === "expense" ? categoryFromPlaid(transaction) : "Other",
      description: transaction.name ?? merchant,
      merchant,
      type,
      source: account.institutionName.toLowerCase().includes("schwab")
        ? "schwab"
        : account.institutionName.toLowerCase().includes("bank of america")
          ? "bofa"
          : "plaid",
      sourceId: transaction.transaction_id,
      sourceAccountId: transaction.account_id,
      rawDescription: transaction.name,
      pending: transaction.pending,
      reviewStatus: type === "expense" ? "accepted" : "needs_review",
    };
  });

  return { inputs, nextCursor };
}

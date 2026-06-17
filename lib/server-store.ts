import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  ConnectedAccount,
  FinanceData,
  ImportDraft,
  ImportTransactionInput,
  ReviewStatus,
  Transaction,
  Category,
  TransactionInput,
  TransactionType,
} from "./types";

const DATA_DIR = path.join(process.cwd(), ".finance-tracker-data");
const DATA_FILE = path.join(DATA_DIR, "finance.json");

const emptyData = (): FinanceData => ({
  transactions: [],
  connectedAccounts: [],
  importDrafts: [],
});

export function createEmptyFinanceData(): FinanceData {
  return emptyData();
}

function nowISO() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeAmount(amount: number) {
  return Math.round(Math.abs(amount) * 100) / 100;
}

function duplicateKey(input: ImportTransactionInput) {
  return [
    input.source,
    input.sourceAccountId ?? "",
    input.date,
    normalizeAmount(input.amount).toFixed(2),
    (input.merchant || input.rawDescription || input.description)
      .trim()
      .toLowerCase(),
  ].join("|");
}

function providerIdKey(input: Pick<ImportTransactionInput, "sourceId">) {
  return input.sourceId ? `provider:${input.sourceId}` : null;
}

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify(emptyData(), null, 2), "utf8");
  }
}

export async function readFinanceData(): Promise<FinanceData> {
  await ensureDataFile();
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<FinanceData>;
    return {
      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions
        : [],
      connectedAccounts: Array.isArray(parsed.connectedAccounts)
        ? parsed.connectedAccounts
        : [],
      importDrafts: Array.isArray(parsed.importDrafts) ? parsed.importDrafts : [],
    };
  } catch {
    return emptyData();
  }
}

export async function writeFinanceData(data: FinanceData): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${DATA_FILE}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
  await rename(tempFile, DATA_FILE);
}

export function classifyImportedTransaction(
  input: Omit<ImportTransactionInput, "type" | "category"> & {
    category?: ImportTransactionInput["category"];
    type?: ImportTransactionInput["type"];
  },
): { type: TransactionType; category: Category; reviewStatus: ReviewStatus } {
  if (input.type && input.category) {
    return {
      type: input.type,
      category: input.category,
      reviewStatus: input.reviewStatus ?? "accepted",
    };
  }

  const text = `${input.merchant} ${input.description} ${input.rawDescription ?? ""}`
    .toLowerCase()
    .trim();
  const isDeposit =
    text.includes("payroll") ||
    text.includes("salary") ||
    text.includes("direct dep") ||
    text.includes("direct deposit");
  const isSchwabTransfer =
    text.includes("schwab") ||
    text.includes("brokerage") ||
    text.includes("investment");

  if (isDeposit) {
    return { type: "income", category: "Other", reviewStatus: "accepted" };
  }

  if (isSchwabTransfer) {
    return { type: "transfer", category: "Other", reviewStatus: "needs_review" };
  }

  return {
    type: input.type ?? "expense",
    category: input.category ?? "Other",
    reviewStatus: input.reviewStatus ?? "needs_review",
  };
}

function toTransaction(input: ImportTransactionInput): Transaction {
  const timestamp = nowISO();
  const classified = classifyImportedTransaction(input);

  return {
    id: createId("txn"),
    amount: normalizeAmount(input.amount),
    date: input.date,
    postedAt: input.postedAt,
    category: input.category ?? classified.category,
    description: input.description.trim(),
    merchant: input.merchant.trim(),
    type: input.type ?? classified.type,
    source: input.source,
    sourceId: input.sourceId,
    sourceAccountId: input.sourceAccountId,
    rawDescription: input.rawDescription,
    pending: input.pending,
    reviewStatus: input.reviewStatus ?? classified.reviewStatus,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function listTransactions(): Promise<Transaction[]> {
  const data = await readFinanceData();
  return data.transactions;
}

export async function resetFinanceData(): Promise<FinanceData> {
  const data = emptyData();
  await writeFinanceData(data);
  return data;
}

export async function createTransaction(
  input: ImportTransactionInput,
): Promise<Transaction> {
  const data = await readFinanceData();
  const transaction = toTransaction(input);
  data.transactions = [transaction, ...data.transactions];
  await writeFinanceData(data);
  return transaction;
}

export async function updateTransaction(
  id: string,
  input: TransactionInput,
): Promise<Transaction | null> {
  const data = await readFinanceData();
  let updated: Transaction | null = null;

  data.transactions = data.transactions.map((transaction) => {
    if (transaction.id !== id) return transaction;
    updated = {
      ...transaction,
      ...input,
      amount: normalizeAmount(input.amount),
      updatedAt: nowISO(),
    };
    return updated;
  });

  if (!updated) return null;
  await writeFinanceData(data);
  return updated;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const data = await readFinanceData();
  const next = data.transactions.filter((transaction) => transaction.id !== id);
  if (next.length === data.transactions.length) return false;
  data.transactions = next;
  await writeFinanceData(data);
  return true;
}

export async function importTransactions(
  inputs: ImportTransactionInput[],
): Promise<Transaction[]> {
  const data = await readFinanceData();
  const existingProviderIds = new Set(
    data.transactions
      .map((transaction) =>
        providerIdKey(transaction),
      )
      .filter(Boolean),
  );
  const existingFallbackKeys = new Set(
    data.transactions.map((transaction) => duplicateKey(transaction)),
  );

  const imported: Transaction[] = [];
  for (const input of inputs) {
    const providerKey = providerIdKey(input);
    const fallbackKey = duplicateKey(input);
    if (
      (providerKey && existingProviderIds.has(providerKey)) ||
      existingFallbackKeys.has(fallbackKey)
    ) {
      continue;
    }

    const transaction = toTransaction(input);
    imported.push(transaction);
    if (providerKey) existingProviderIds.add(providerKey);
    existingFallbackKeys.add(fallbackKey);
  }

  data.transactions = [...imported, ...data.transactions];
  await writeFinanceData(data);
  return imported;
}

export async function upsertConnectedAccounts(
  accounts: ConnectedAccount[],
): Promise<ConnectedAccount[]> {
  const data = await readFinanceData();
  const byId = new Map(data.connectedAccounts.map((account) => [account.id, account]));

  for (const account of accounts) {
    byId.set(account.id, {
      ...byId.get(account.id),
      ...account,
      updatedAt: nowISO(),
    });
  }

  data.connectedAccounts = [...byId.values()];
  await writeFinanceData(data);
  return data.connectedAccounts;
}

export async function updateConnectedAccount(
  id: string,
  patch: Partial<ConnectedAccount>,
): Promise<ConnectedAccount | null> {
  const data = await readFinanceData();
  let updated: ConnectedAccount | null = null;
  data.connectedAccounts = data.connectedAccounts.map((account) => {
    if (account.id !== id) return account;
    updated = { ...account, ...patch, updatedAt: nowISO() };
    return updated;
  });
  if (!updated) return null;
  await writeFinanceData(data);
  return updated;
}

export async function createImportDraft(
  draft: Omit<ImportDraft, "id" | "createdAt" | "updatedAt">,
): Promise<ImportDraft> {
  const data = await readFinanceData();
  const timestamp = nowISO();
  const next: ImportDraft = {
    ...draft,
    id: createId("draft"),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  data.importDrafts = [next, ...data.importDrafts];
  await writeFinanceData(data);
  return next;
}

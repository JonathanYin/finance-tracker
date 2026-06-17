import type {
  Expense,
  ExpenseStore,
  Subscription,
  SubscriptionStore,
  Transaction,
  TransactionStore,
} from "./types";

const STORAGE_KEY = "finance-tracker:expenses";
const TRANSACTIONS_STORAGE_KEY = "finance-tracker:transactions";
const SUBSCRIPTIONS_STORAGE_KEY = "finance-tracker:subscriptions";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function migrateExpense(expense: Expense): Transaction {
  return {
    ...expense,
    type: "expense",
    notes: "",
  };
}

/**
 * localStorage-backed ExpenseStore. All access is guarded for SSR
 * (the App Router renders on the server first, where `window` is absent).
 */
export const localStorageStore: ExpenseStore = {
  load(): Expense[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Expense[]) : [];
    } catch {
      return [];
    }
  },

  save(expenses: Expense[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch {
      // Quota errors / private-mode restrictions are non-fatal for the MVP.
    }
  },
};

export const transactionsStorageStore: TransactionStore = {
  load(): Transaction[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as Transaction[];
      }

      const legacyRaw = window.localStorage.getItem(STORAGE_KEY);
      if (!legacyRaw) return [];
      const legacyParsed = JSON.parse(legacyRaw);
      if (!Array.isArray(legacyParsed)) return [];

      return legacyParsed
        .filter((value): value is Expense => isRecord(value))
        .map(migrateExpense);
    } catch {
      return [];
    }
  },

  save(transactions: Transaction[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        TRANSACTIONS_STORAGE_KEY,
        JSON.stringify(transactions),
      );
    } catch {
      // Quota errors / private-mode restrictions are non-fatal for the MVP.
    }
  },
};

export const subscriptionsStorageStore: SubscriptionStore = {
  load(): Subscription[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Subscription[]) : [];
    } catch {
      return [];
    }
  },

  save(subscriptions: Subscription[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        SUBSCRIPTIONS_STORAGE_KEY,
        JSON.stringify(subscriptions),
      );
    } catch {
      // Quota errors / private-mode restrictions are non-fatal for the MVP.
    }
  },
};

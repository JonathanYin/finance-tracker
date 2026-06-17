"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  BillingCycle,
  Expense,
  ExpenseInput,
  Subscription,
  SubscriptionInput,
  Transaction,
  TransactionInput,
} from "./types";
import { localStorageStore, subscriptionsStorageStore } from "./storage";
import { todayISO } from "./format";

interface ExpensesContextValue {
  expenses: Transaction[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  hydrated: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addExpense: (input: ExpenseInput) => Promise<void>;
  updateExpense: (id: string, input: ExpenseInput) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addTransaction: (input: TransactionInput) => Promise<void>;
  updateTransaction: (id: string, input: TransactionInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addSubscription: (input: SubscriptionInput) => void;
  updateSubscription: (id: string, input: SubscriptionInput) => void;
  deleteSubscription: (id: string) => void;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);
const LOCAL_IMPORT_MARKER = "finance-tracker:local-imported";

async function readJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(json.error ?? "Request failed.");
  }
  return json;
}

function toExpenseTransaction(input: ExpenseInput): TransactionInput {
  return { ...input, type: "expense" };
}

function parseISODate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function formatISODate(year: number, month: number, day: number) {
  return [
    String(year),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function addMonthsClamped(iso: string, monthsToAdd: number) {
  const parsed = parseISODate(iso);
  if (!parsed) return iso;

  const monthIndex = parsed.month - 1 + monthsToAdd;
  const targetYear = parsed.year + Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  const targetMonth = targetMonthIndex + 1;
  const targetDay = Math.min(
    parsed.day,
    daysInMonth(targetYear, targetMonth),
  );

  return formatISODate(targetYear, targetMonth, targetDay);
}

function advanceBillingDate(
  nextBillingDate: string,
  billingCycle: BillingCycle,
  today = todayISO(),
) {
  if (nextBillingDate > today) return nextBillingDate;

  const monthsToAdd = billingCycle === "monthly" ? 1 : 12;
  let advanced = nextBillingDate;
  while (advanced <= today) {
    const next = addMonthsClamped(advanced, monthsToAdd);
    if (next === advanced) return nextBillingDate;
    advanced = next;
  }
  return advanced;
}

function advanceDueSubscriptions(subscriptions: Subscription[]) {
  return subscriptions.map((subscription) => ({
    ...subscription,
    nextBillingDate: advanceBillingDate(
      subscription.nextBillingDate,
      subscription.billingCycle,
    ),
  }));
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const json = await readJson<{ transactions: Transaction[] }>(
      await fetch("/api/transactions", { cache: "no-store" }),
    );
    setTransactions(json.transactions);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        setSubscriptions(advanceDueSubscriptions(subscriptionsStorageStore.load()));
        await refresh();

        if (typeof window !== "undefined") {
          const legacy = localStorageStore.load();
          const alreadyImported = window.localStorage.getItem(LOCAL_IMPORT_MARKER);
          if (legacy.length > 0 && !alreadyImported) {
            await readJson<{ transactions: Expense[] }>(
              await fetch("/api/import/local", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expenses: legacy }),
              }),
            );
            window.localStorage.setItem(LOCAL_IMPORT_MARKER, "1");
            await refresh();
          }
        }

        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data.");
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (hydrated) subscriptionsStorageStore.save(subscriptions);
  }, [subscriptions, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const intervalId = window.setInterval(() => {
      setSubscriptions((prev) => advanceDueSubscriptions(prev));
    }, 60 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [hydrated]);

  const addTransaction = useCallback(
    async (input: TransactionInput) => {
      const json = await readJson<{ transaction: Transaction }>(
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            source: "manual",
            reviewStatus: "accepted",
          }),
        }),
      );
      setTransactions((prev) => [json.transaction, ...prev]);
    },
    [],
  );

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput) => {
      const json = await readJson<{ transaction: Transaction }>(
        await fetch(`/api/transactions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction.id === id ? json.transaction : transaction,
        ),
      );
    },
    [],
  );

  const deleteTransaction = useCallback(async (id: string) => {
    await readJson<{ ok: boolean }>(
      await fetch(`/api/transactions/${id}`, { method: "DELETE" }),
    );
    setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
  }, []);

  const addSubscription = useCallback((input: SubscriptionInput) => {
    const subscription: Subscription = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setSubscriptions((prev) => [subscription, ...prev]);
  }, []);

  const updateSubscription = useCallback(
    (id: string, input: SubscriptionInput) => {
      setSubscriptions((prev) =>
        prev.map((subscription) =>
          subscription.id === id ? { ...subscription, ...input } : subscription,
        ),
      );
    },
    [],
  );

  const deleteSubscription = useCallback((id: string) => {
    setSubscriptions((prev) =>
      prev.filter((subscription) => subscription.id !== id),
    );
  }, []);

  const value = useMemo<ExpensesContextValue>(
    () => ({
      expenses: transactions,
      transactions,
      subscriptions,
      hydrated,
      error,
      refresh,
      addExpense: (input) => addTransaction(toExpenseTransaction(input)),
      updateExpense: (id, input) =>
        updateTransaction(id, toExpenseTransaction(input)),
      deleteExpense: deleteTransaction,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addSubscription,
      updateSubscription,
      deleteSubscription,
    }),
    [
      addSubscription,
      addTransaction,
      deleteSubscription,
      deleteTransaction,
      error,
      hydrated,
      refresh,
      subscriptions,
      transactions,
      updateSubscription,
      updateTransaction,
    ],
  );

  return (
    <ExpensesContext.Provider value={value}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses(): ExpensesContextValue {
  const ctx = useContext(ExpensesContext);
  if (!ctx) {
    throw new Error("useExpenses must be used within an ExpensesProvider");
  }
  return ctx;
}

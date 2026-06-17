"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  BillingCycle,
  Expense,
  ExpenseInput,
  ExpenseTransaction,
  Subscription,
  SubscriptionInput,
  Transaction,
  TransactionInput,
} from "./types";
import {
  subscriptionsStorageStore,
  transactionsStorageStore,
} from "./storage";
import { todayISO } from "./format";

interface ExpensesContextValue {
  expenses: Expense[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  hydrated: boolean;
  addExpense: (input: ExpenseInput) => void;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => void;
  addTransaction: (input: TransactionInput) => void;
  updateTransaction: (id: string, input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;
  addSubscription: (input: SubscriptionInput) => void;
  updateSubscription: (id: string, input: SubscriptionInput) => void;
  deleteSubscription: (id: string) => void;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

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
  const expenses = transactions.filter(
    (transaction): transaction is ExpenseTransaction =>
      transaction.type === "expense",
  );

  // Hydrate from storage on mount (never during render → no SSR mismatch).
  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setTransactions(transactionsStorageStore.load());
      setSubscriptions(advanceDueSubscriptions(subscriptionsStorageStore.load()));
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on every change, but only after the initial hydration so we
  // don't overwrite stored data with the empty initial state.
  useEffect(() => {
    if (hydrated) transactionsStorageStore.save(transactions);
  }, [transactions, hydrated]);

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

  const addTransaction = useCallback((input: TransactionInput) => {
    const common = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      source: "manual",
    } as const;

    const transaction: Transaction =
      input.type === "expense"
        ? { ...input, ...common, notes: "" }
        : { ...input, ...common };

    setTransactions((prev) => [transaction, ...prev]);
  }, []);

  const updateTransaction = useCallback(
    (id: string, input: TransactionInput) => {
      setTransactions((prev) =>
        prev.map((transaction) => {
          if (transaction.id !== id) return transaction;
          const common = {
            id: transaction.id,
            createdAt: transaction.createdAt,
            source: transaction.source,
          };
          if (input.type === "expense") {
            return { ...input, ...common, notes: "" };
          }
          return { ...input, ...common };
        }),
      );
    },
    [],
  );

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) =>
      prev.filter((transaction) => transaction.id !== id),
    );
  }, []);

  const addExpense = useCallback(
    (input: ExpenseInput) => {
      addTransaction({ ...input, type: "expense" });
    },
    [addTransaction],
  );

  const updateExpense = useCallback((id: string, input: ExpenseInput) => {
    updateTransaction(id, { ...input, type: "expense" });
  }, [updateTransaction]);

  const deleteExpense = useCallback((id: string) => {
    deleteTransaction(id);
  }, [deleteTransaction]);

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

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        transactions,
        subscriptions,
        hydrated,
        addExpense,
        updateExpense,
        deleteExpense,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addSubscription,
        updateSubscription,
        deleteSubscription,
      }}
    >
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

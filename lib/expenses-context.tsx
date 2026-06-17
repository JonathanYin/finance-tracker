"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  Expense,
  ExpenseInput,
  Subscription,
  SubscriptionInput,
} from "./types";
import { localStorageStore, subscriptionsStorageStore } from "./storage";

interface ExpensesContextValue {
  expenses: Expense[];
  subscriptions: Subscription[];
  hydrated: boolean;
  addExpense: (input: ExpenseInput) => void;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => void;
  addSubscription: (input: SubscriptionInput) => void;
  updateSubscription: (id: string, input: SubscriptionInput) => void;
  deleteSubscription: (id: string) => void;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage on mount (never during render → no SSR mismatch).
  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setExpenses(localStorageStore.load());
      setSubscriptions(subscriptionsStorageStore.load());
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on every change, but only after the initial hydration so we
  // don't overwrite stored data with the empty initial state.
  useEffect(() => {
    if (hydrated) localStorageStore.save(expenses);
  }, [expenses, hydrated]);

  useEffect(() => {
    if (hydrated) subscriptionsStorageStore.save(subscriptions);
  }, [subscriptions, hydrated]);

  const addExpense = useCallback((input: ExpenseInput) => {
    const expense: Expense = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      source: "manual",
    };
    setExpenses((prev) => [expense, ...prev]);
  }, []);

  const updateExpense = useCallback((id: string, input: ExpenseInput) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...input } : e)),
    );
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
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

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        subscriptions,
        hydrated,
        addExpense,
        updateExpense,
        deleteExpense,
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

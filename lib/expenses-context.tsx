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
  Subscription,
  SubscriptionInput,
} from "./types";
import { localStorageStore, subscriptionsStorageStore } from "./storage";
import { todayISO } from "./format";

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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage on mount (never during render → no SSR mismatch).
  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setExpenses(localStorageStore.load());
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
    if (hydrated) localStorageStore.save(expenses);
  }, [expenses, hydrated]);

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

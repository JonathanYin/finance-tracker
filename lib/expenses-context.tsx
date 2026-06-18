"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  AuthActionResult,
  BillingCycle,
  Expense,
  ExpenseInput,
  Subscription,
  SubscriptionInput,
} from "./types";
import {
  createSupabaseExpenseStore,
  createSupabaseSubscriptionStore,
  localStorageStore,
  subscriptionsStorageStore,
} from "./storage";
import { todayISO } from "./format";
import { createClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";

type SyncStatus = "guest" | "loading" | "importing" | "cloud" | "error";

interface ExpensesContextValue {
  expenses: Expense[];
  subscriptions: Subscription[];
  hydrated: boolean;
  authEnabled: boolean;
  authLoading: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  user: User | null;
  addExpense: (input: ExpenseInput) => Promise<void>;
  updateExpense: (id: string, input: ExpenseInput) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addSubscription: (input: SubscriptionInput) => Promise<void>;
  updateSubscription: (id: string, input: SubscriptionInput) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
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

function changedSubscriptions(before: Subscription[], after: Subscription[]) {
  const beforeDates = new Map(
    before.map((subscription) => [
      subscription.id,
      subscription.nextBillingDate,
    ]),
  );
  return after.filter(
    (subscription) =>
      beforeDates.get(subscription.id) !== subscription.nextBillingDate,
  );
}

function importedKey(userId: string) {
  return `finance-tracker:cloud-imported:${userId}`;
}

function hasImportedLocalData(userId: string) {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(importedKey(userId)) === "1";
}

function markLocalDataImported(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(importedKey(userId), "1");
}

function storesForUser(supabase: SupabaseClient | null, userId?: string) {
  if (!supabase || !userId) {
    return {
      expenseStore: localStorageStore,
      subscriptionStore: subscriptionsStorageStore,
    };
  }

  return {
    expenseStore: createSupabaseExpenseStore(supabase, userId),
    subscriptionStore: createSupabaseSubscriptionStore(supabase, userId),
  };
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const authEnabled = isSupabaseConfigured();
  const supabase = useMemo(
    () => (authEnabled ? createClient() : null),
    [authEnabled],
  );
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [authLoading, setAuthLoading] = useState(authEnabled);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const activeStores = useMemo(
    () => storesForUser(supabase, user?.id),
    [supabase, user?.id],
  );

  const loadData = useCallback(
    async (nextUser: User | null, options?: { importLocal: boolean }) => {
      const { expenseStore, subscriptionStore } = storesForUser(
        supabase,
        nextUser?.id,
      );
      setHydrated(false);
      setSyncError(null);
      setSyncStatus(nextUser ? "loading" : "guest");

      try {
        if (nextUser && options?.importLocal && !hasImportedLocalData(nextUser.id)) {
          setSyncStatus("importing");
          const [localExpenses, localSubscriptions] = await Promise.all([
            localStorageStore.load(),
            subscriptionsStorageStore.load(),
          ]);
          await Promise.all([
            expenseStore.upsert(localExpenses),
            subscriptionStore.upsert(localSubscriptions),
          ]);
          markLocalDataImported(nextUser.id);
        }

        const [loadedExpenses, loadedSubscriptions] = await Promise.all([
          expenseStore.load(),
          subscriptionStore.load(),
        ]);
        const advancedSubscriptions =
          advanceDueSubscriptions(loadedSubscriptions);
        const changed = changedSubscriptions(
          loadedSubscriptions,
          advancedSubscriptions,
        );
        if (changed.length > 0) await subscriptionStore.upsert(changed);

        setExpenses(loadedExpenses);
        setSubscriptions(advancedSubscriptions);
        setSyncStatus(nextUser ? "cloud" : "guest");
      } catch (error) {
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "Unable to load data.");
      } finally {
        setHydrated(true);
      }
    },
    [supabase],
  );

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (!supabase) {
        setAuthLoading(false);
        await loadData(null, { importLocal: false });
        return;
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error) {
        setSyncError(error.message);
        setSyncStatus("error");
        setHydrated(true);
      } else {
        setUser(session?.user ?? null);
        await loadData(session?.user ?? null, { importLocal: true });
      }
      if (!cancelled) setAuthLoading(false);
    }

    initialize();

    if (!supabase) {
      return () => {
        cancelled = true;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadData(session?.user ?? null, { importLocal: true });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadData, supabase]);

  useEffect(() => {
    if (!hydrated) return;
    const intervalId = window.setInterval(() => {
      setSubscriptions((prev) => {
        const advanced = advanceDueSubscriptions(prev);
        const changed = changedSubscriptions(prev, advanced);
        if (changed.length > 0) {
          void activeStores.subscriptionStore.upsert(changed).catch((error) => {
            setSyncStatus("error");
            setSyncError(
              error instanceof Error
                ? error.message
                : "Unable to advance subscriptions.",
            );
          });
        }
        return advanced;
      });
    }, 60 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [activeStores.subscriptionStore, hydrated]);

  const addExpense = useCallback(
    async (input: ExpenseInput) => {
      const expense: Expense = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        source: "manual",
      };
      setExpenses((prev) => [expense, ...prev]);
      try {
        await activeStores.expenseStore.upsert([expense]);
      } catch (error) {
        setExpenses((prev) => prev.filter((item) => item.id !== expense.id));
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "Unable to add expense.");
        throw error;
      }
    },
    [activeStores.expenseStore],
  );

  const updateExpense = useCallback(
    async (id: string, input: ExpenseInput) => {
      const previous = expenses.find((expense) => expense.id === id);
      if (!previous) return;
      const next = { ...previous, ...input };
      setExpenses((prev) =>
        prev.map((expense) => (expense.id === id ? next : expense)),
      );
      try {
        await activeStores.expenseStore.upsert([next]);
      } catch (error) {
        setExpenses((prev) =>
          prev.map((expense) => (expense.id === id ? previous : expense)),
        );
        setSyncStatus("error");
        setSyncError(
          error instanceof Error ? error.message : "Unable to update expense.",
        );
        throw error;
      }
    },
    [activeStores.expenseStore, expenses],
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const previous = expenses.find((expense) => expense.id === id);
      setExpenses((prev) => prev.filter((expense) => expense.id !== id));
      try {
        await activeStores.expenseStore.remove(id);
      } catch (error) {
        if (previous) setExpenses((prev) => [previous, ...prev]);
        setSyncStatus("error");
        setSyncError(
          error instanceof Error ? error.message : "Unable to delete expense.",
        );
        throw error;
      }
    },
    [activeStores.expenseStore, expenses],
  );

  const addSubscription = useCallback(
    async (input: SubscriptionInput) => {
      const subscription: Subscription = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setSubscriptions((prev) => [subscription, ...prev]);
      try {
        await activeStores.subscriptionStore.upsert([subscription]);
      } catch (error) {
        setSubscriptions((prev) =>
          prev.filter((item) => item.id !== subscription.id),
        );
        setSyncStatus("error");
        setSyncError(
          error instanceof Error ? error.message : "Unable to add subscription.",
        );
        throw error;
      }
    },
    [activeStores.subscriptionStore],
  );

  const updateSubscription = useCallback(
    async (id: string, input: SubscriptionInput) => {
      const previous = subscriptions.find(
        (subscription) => subscription.id === id,
      );
      if (!previous) return;
      const next = { ...previous, ...input };
      setSubscriptions((prev) =>
        prev.map((subscription) =>
          subscription.id === id ? next : subscription,
        ),
      );
      try {
        await activeStores.subscriptionStore.upsert([next]);
      } catch (error) {
        setSubscriptions((prev) =>
          prev.map((subscription) =>
            subscription.id === id ? previous : subscription,
          ),
        );
        setSyncStatus("error");
        setSyncError(
          error instanceof Error
            ? error.message
            : "Unable to update subscription.",
        );
        throw error;
      }
    },
    [activeStores.subscriptionStore, subscriptions],
  );

  const deleteSubscription = useCallback(
    async (id: string) => {
      const previous = subscriptions.find(
        (subscription) => subscription.id === id,
      );
      setSubscriptions((prev) =>
        prev.filter((subscription) => subscription.id !== id),
      );
      try {
        await activeStores.subscriptionStore.remove(id);
      } catch (error) {
        if (previous) setSubscriptions((prev) => [previous, ...prev]);
        setSyncStatus("error");
        setSyncError(
          error instanceof Error
            ? error.message
            : "Unable to delete subscription.",
        );
        throw error;
      }
    },
    [activeStores.subscriptionStore, subscriptions],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!supabase) return { error: "Supabase is not configured." };
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (!data.session) {
        return { message: "Check your email to finish creating your account." };
      }
      return {};
    },
    [supabase],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!supabase) return { error: "Supabase is not configured." };
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error ? { error: error.message } : {};
    },
    [supabase],
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!supabase) return { error: "Supabase is not configured." };
    const { error } = await supabase.auth.signOut();
    return error ? { error: error.message } : {};
  }, [supabase]);

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        subscriptions,
        hydrated,
        authEnabled,
        authLoading,
        syncStatus,
        syncError,
        user,
        addExpense,
        updateExpense,
        deleteExpense,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        signUp,
        signIn,
        signOut,
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

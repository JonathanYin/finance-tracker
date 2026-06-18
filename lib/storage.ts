import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense, ExpenseStore, Subscription, SubscriptionStore } from "./types";

const EXPENSES_STORAGE_KEY = "finance-tracker:expenses";
const SUBSCRIPTIONS_STORAGE_KEY = "finance-tracker:subscriptions";

type ExpenseRow = {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  category: Expense["category"];
  description: string;
  merchant: string;
  source: Expense["source"];
  created_at: string;
  updated_at?: string | null;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  billing_cycle: Subscription["billingCycle"];
  next_billing_date: string;
  category: Subscription["category"];
  merchant: string;
  notes: string;
  created_at: string;
  updated_at?: string | null;
};

function readLocalArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocalArray<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Quota errors / private-mode restrictions are non-fatal for guest mode.
  }
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const next = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) next.set(item.id, item);
  return [...next.values()];
}

export const localStorageStore: ExpenseStore = {
  async load(): Promise<Expense[]> {
    return readLocalArray<Expense>(EXPENSES_STORAGE_KEY);
  },

  async upsert(expenses: Expense[]): Promise<void> {
    writeLocalArray(
      EXPENSES_STORAGE_KEY,
      mergeById(readLocalArray<Expense>(EXPENSES_STORAGE_KEY), expenses),
    );
  },

  async remove(id: string): Promise<void> {
    writeLocalArray(
      EXPENSES_STORAGE_KEY,
      readLocalArray<Expense>(EXPENSES_STORAGE_KEY).filter((expense) => expense.id !== id),
    );
  },
};

export const subscriptionsStorageStore: SubscriptionStore = {
  async load(): Promise<Subscription[]> {
    return readLocalArray<Subscription>(SUBSCRIPTIONS_STORAGE_KEY);
  },

  async upsert(subscriptions: Subscription[]): Promise<void> {
    writeLocalArray(
      SUBSCRIPTIONS_STORAGE_KEY,
      mergeById(
        readLocalArray<Subscription>(SUBSCRIPTIONS_STORAGE_KEY),
        subscriptions,
      ),
    );
  },

  async remove(id: string): Promise<void> {
    writeLocalArray(
      SUBSCRIPTIONS_STORAGE_KEY,
      readLocalArray<Subscription>(SUBSCRIPTIONS_STORAGE_KEY).filter(
        (subscription) => subscription.id !== id,
      ),
    );
  },
};

function expenseFromRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: Number(row.amount),
    date: row.date,
    category: row.category,
    description: row.description,
    merchant: row.merchant,
    createdAt: row.created_at,
    source: row.source,
  };
}

function expenseToRow(expense: Expense, userId: string): ExpenseRow {
  return {
    id: expense.id,
    user_id: userId,
    amount: expense.amount,
    date: expense.date,
    category: expense.category,
    description: expense.description,
    merchant: expense.merchant,
    source: expense.source,
    created_at: expense.createdAt,
    updated_at: new Date().toISOString(),
  };
}

function subscriptionFromRow(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    billingCycle: row.billing_cycle,
    nextBillingDate: row.next_billing_date,
    category: row.category,
    merchant: row.merchant,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function subscriptionToRow(
  subscription: Subscription,
  userId: string,
): SubscriptionRow {
  return {
    id: subscription.id,
    user_id: userId,
    name: subscription.name,
    amount: subscription.amount,
    billing_cycle: subscription.billingCycle,
    next_billing_date: subscription.nextBillingDate,
    category: subscription.category,
    merchant: subscription.merchant,
    notes: subscription.notes,
    created_at: subscription.createdAt,
    updated_at: new Date().toISOString(),
  };
}

export function createSupabaseExpenseStore(
  supabase: SupabaseClient,
  userId: string,
): ExpenseStore {
  return {
    async load(): Promise<Expense[]> {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as ExpenseRow[]).map(expenseFromRow);
    },

    async upsert(expenses: Expense[]): Promise<void> {
      if (expenses.length === 0) return;
      const { error } = await supabase
        .from("expenses")
        .upsert(expenses.map((expense) => expenseToRow(expense, userId)), {
          onConflict: "id",
        });
      if (error) throw error;
    },

    async remove(id: string): Promise<void> {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
  };
}

export function createSupabaseSubscriptionStore(
  supabase: SupabaseClient,
  userId: string,
): SubscriptionStore {
  return {
    async load(): Promise<Subscription[]> {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("next_billing_date", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as SubscriptionRow[]).map(subscriptionFromRow);
    },

    async upsert(subscriptions: Subscription[]): Promise<void> {
      if (subscriptions.length === 0) return;
      const { error } = await supabase
        .from("subscriptions")
        .upsert(
          subscriptions.map((subscription) =>
            subscriptionToRow(subscription, userId),
          ),
          { onConflict: "id" },
        );
      if (error) throw error;
    },

    async remove(id: string): Promise<void> {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
  };
}

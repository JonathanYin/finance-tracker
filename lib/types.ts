export type Category =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Entertainment"
  | "Health"
  | "Travel"
  | "Other";

/**
 * Where an expense came from. Always "manual" in the MVP; future bank /
 * email / receipt integrations will set their own source so imported
 * expenses are distinguishable and de-dup logic has something to key on.
 */
export type ExpenseSource = "manual" | "schwab" | "bofa" | "email" | "receipt";

export interface Expense {
  id: string;
  amount: number; // positive number, in dollars
  date: string; // ISO yyyy-mm-dd
  category: Category;
  description: string;
  merchant: string;
  createdAt: string; // ISO timestamp
  source: ExpenseSource;
}

/** Fields the user supplies; everything else is filled in on create. */
export type ExpenseInput = Omit<Expense, "id" | "createdAt" | "source">;

export type BillingCycle = "monthly" | "yearly";

export interface Subscription {
  id: string;
  name: string;
  amount: number; // positive number, in dollars
  billingCycle: BillingCycle;
  nextBillingDate: string; // ISO yyyy-mm-dd
  category: Category;
  merchant: string;
  notes: string;
  createdAt: string; // ISO timestamp
}

/** Fields the user supplies; everything else is filled in on create. */
export type SubscriptionInput = Omit<Subscription, "id" | "createdAt">;

/**
 * Persistence boundary. The app ships localStorage and Supabase
 * implementations; components stay behind this interface.
 */
export interface ExpenseStore {
  load(): Promise<Expense[]>;
  upsert(expenses: Expense[]): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface SubscriptionStore {
  load(): Promise<Subscription[]>;
  upsert(subscriptions: Subscription[]): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface AuthActionResult {
  error?: string;
  message?: string;
}

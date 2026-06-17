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

/**
 * Persistence boundary. The MVP ships a localStorage implementation, but a
 * future API / bank-sync store can be dropped in behind the same interface.
 */
export interface ExpenseStore {
  load(): Expense[];
  save(expenses: Expense[]): void;
}

import type { Expense, ExpenseStore } from "./types";

const STORAGE_KEY = "finance-tracker:expenses";

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

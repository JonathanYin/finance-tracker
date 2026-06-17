"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Expense, ExpenseInput } from "./types";
import { localStorageStore } from "./storage";

interface ExpensesContextValue {
  expenses: Expense[];
  hydrated: boolean;
  addExpense: (input: ExpenseInput) => void;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => void;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage on mount (never during render → no SSR mismatch).
  useEffect(() => {
    setExpenses(localStorageStore.load());
    setHydrated(true);
  }, []);

  // Persist on every change, but only after the initial hydration so we
  // don't overwrite stored data with the empty initial state.
  useEffect(() => {
    if (hydrated) localStorageStore.save(expenses);
  }, [expenses, hydrated]);

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

  return (
    <ExpensesContext.Provider
      value={{ expenses, hydrated, addExpense, updateExpense, deleteExpense }}
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

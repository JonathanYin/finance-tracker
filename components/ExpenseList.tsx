"use client";

import { useMemo } from "react";
import { useExpenses } from "@/lib/expenses-context";
import ExpenseItem from "./ExpenseItem";
import type { Expense } from "@/lib/types";

interface ExpenseListProps {
  onEdit: (expense: Expense) => void;
}

export default function ExpenseList({ onEdit }: ExpenseListProps) {
  const { expenses } = useExpenses();

  const sorted = useMemo(
    () =>
      [...expenses].sort((a, b) => {
        // Most recent date first; tie-break on creation time.
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.createdAt < b.createdAt ? 1 : -1;
      }),
    [expenses],
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg bg-canvas-soft px-4 py-12 text-center text-sm text-body shadow-card">
        No expenses yet. Add your first one above.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((expense) => (
        <ExpenseItem key={expense.id} expense={expense} onEdit={onEdit} />
      ))}
    </ul>
  );
}

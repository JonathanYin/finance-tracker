"use client";

import { useMemo } from "react";
import { useExpenses } from "@/lib/expenses-context";
import ExpenseItem from "./ExpenseItem";
import type { Transaction } from "@/lib/types";

interface ExpenseListProps {
  onEdit: (expense: Transaction) => void;
}

export default function ExpenseList({ onEdit }: ExpenseListProps) {
  const { transactions } = useExpenses();

  const sorted = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        // Most recent date first; tie-break on creation time.
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.createdAt < b.createdAt ? 1 : -1;
      }),
    [transactions],
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg bg-canvas-soft px-4 py-12 text-center text-sm text-body shadow-card">
        No transactions yet. Add your first one above.
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

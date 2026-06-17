"use client";

import { useExpenses } from "@/lib/expenses-context";
import { BADGE_CLASS } from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Expense } from "@/lib/types";

interface ExpenseItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
}

export default function ExpenseItem({ expense, onEdit }: ExpenseItemProps) {
  const { deleteExpense } = useExpenses();

  return (
    <li className="flex items-center justify-between gap-4 rounded-md bg-canvas px-4 py-3 shadow-card">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-ink">
            {expense.merchant || expense.description || "Expense"}
          </span>
          <span
            className={`shrink-0 px-2 py-0.5 text-xs font-medium ${BADGE_CLASS}`}
          >
            {expense.category}
          </span>
        </div>
        <div className="mt-0.5 truncate text-sm text-body">
          {[expense.merchant && expense.description, formatDate(expense.date)]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm font-medium tabular-nums text-ink">
          {formatCurrency(expense.amount)}
        </span>
        <button
          type="button"
          onClick={() => onEdit(expense)}
          className="rounded-sm px-2 py-1 text-sm text-body transition-colors hover:bg-canvas-soft-2 hover:text-ink"
          aria-label="Edit expense"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => deleteExpense(expense.id)}
          className="rounded-sm px-2 py-1 text-sm text-error transition-colors hover:bg-error-soft"
          aria-label="Delete expense"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

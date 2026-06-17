"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useExpenses } from "@/lib/expenses-context";
import { formatCurrency } from "@/lib/format";
import { hrefWithParam } from "@/lib/url-params";
import ExpenseItem from "./ExpenseItem";
import type { Expense } from "@/lib/types";

const EXPENSES_PER_BATCH = 50;

interface ExpenseListProps {
  onEdit: (expense: Expense) => void;
}

export default function ExpenseList({ onEdit }: ExpenseListProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg bg-canvas-soft px-4 py-12 text-center text-sm text-body shadow-card">
          Loading expenses...
        </div>
      }
    >
      <PaginatedExpenseList onEdit={onEdit} />
    </Suspense>
  );
}

function PaginatedExpenseList({ onEdit }: ExpenseListProps) {
  const { expenses } = useExpenses();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");
  const [visibleRows, setVisibleRows] = useState({
    month: "",
    count: EXPENSES_PER_BATCH,
  });

  const sorted = useMemo(
    () =>
      [...expenses].sort((a, b) => {
        // Most recent date first; tie-break on creation time.
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.createdAt < b.createdAt ? 1 : -1;
      }),
    [expenses],
  );

  const months = useMemo(() => {
    const monthMap = new Map<string, Expense[]>();
    for (const expense of sorted) {
      const month = monthFromDate(expense.date);
      if (!month) continue;
      const bucket = monthMap.get(month);
      if (bucket) {
        bucket.push(expense);
      } else {
        monthMap.set(month, [expense]);
      }
    }
    return [...monthMap.entries()].map(([month, expenses]) => ({
      month,
      expenses,
      total: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    }));
  }, [sorted]);

  const selectedMonth =
    months.find((entry) => entry.month === monthParam)?.month ??
    months[0]?.month ??
    null;
  const selectedIndex = months.findIndex(
    (entry) => entry.month === selectedMonth,
  );
  const selectedEntry =
    selectedIndex >= 0 ? months[selectedIndex] : null;

  useEffect(() => {
    if (!selectedMonth || monthParam === selectedMonth) return;
    router.replace(hrefWithParam(pathname, searchParams, "month", selectedMonth), {
      scroll: false,
    });
  }, [monthParam, pathname, router, searchParams, selectedMonth]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg bg-canvas-soft px-4 py-12 text-center text-sm text-body shadow-card">
        No expenses yet. Add your first one above.
      </div>
    );
  }

  if (!selectedEntry) return null;

  const previousMonth = months[selectedIndex + 1]?.month ?? null;
  const nextMonth = months[selectedIndex - 1]?.month ?? null;
  const visibleCount =
    visibleRows.month === selectedEntry.month
      ? visibleRows.count
      : EXPENSES_PER_BATCH;
  const visibleExpenses = selectedEntry.expenses.slice(0, visibleCount);
  const remainingCount = selectedEntry.expenses.length - visibleExpenses.length;

  function goToMonth(month: string) {
    router.replace(hrefWithParam(pathname, searchParams, "month", month), {
      scroll: false,
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-lg bg-canvas p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-wide text-mute">
              Showing
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">
              {formatMonth(selectedEntry.month)}
            </h2>
            <p className="mt-1 text-sm text-body">
              {selectedEntry.expenses.length}{" "}
              {selectedEntry.expenses.length === 1 ? "expense" : "expenses"} ·{" "}
              <span className="font-mono tabular-nums text-ink">
                {formatCurrency(selectedEntry.total)}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <label className="sr-only" htmlFor="expense-month">
              Select expense month
            </label>
            <select
              id="expense-month"
              value={selectedEntry.month}
              onChange={(event) => goToMonth(event.target.value)}
              className="h-9 rounded-sm border border-hairline bg-canvas px-3 text-sm text-ink outline-none focus:border-hairline-strong"
            >
              {months.map((entry) => (
                <option key={entry.month} value={entry.month}>
                  {formatMonth(entry.month)}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => previousMonth && goToMonth(previousMonth)}
                disabled={!previousMonth}
                className="h-9 rounded-sm border border-hairline bg-canvas px-3 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft-2 disabled:cursor-not-allowed disabled:text-mute disabled:hover:bg-canvas"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => nextMonth && goToMonth(nextMonth)}
                disabled={!nextMonth}
                className="h-9 rounded-sm border border-hairline bg-canvas px-3 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft-2 disabled:cursor-not-allowed disabled:text-mute disabled:hover:bg-canvas"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {visibleExpenses.map((expense) => (
          <ExpenseItem key={expense.id} expense={expense} onEdit={onEdit} />
        ))}
      </ul>

      {remainingCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setVisibleRows({
              month: selectedEntry.month,
              count: visibleCount + EXPENSES_PER_BATCH,
            });
          }}
          className="h-10 rounded-sm border border-hairline bg-canvas px-4 text-sm font-medium text-ink shadow-card transition-colors hover:bg-canvas-soft-2"
        >
          Show {Math.min(remainingCount, EXPENSES_PER_BATCH)} more
        </button>
      )}
    </section>
  );
}

function monthFromDate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.slice(0, 7) : null;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

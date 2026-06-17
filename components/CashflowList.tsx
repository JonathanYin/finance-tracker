"use client";

import { Suspense, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BADGE_CLASS } from "@/lib/categories";
import { useExpenses } from "@/lib/expenses-context";
import { formatCurrency, formatDate } from "@/lib/format";
import { hrefWithParam } from "@/lib/url-params";
import type {
  IncomeTransaction,
  SavingsTransferTransaction,
  Transaction,
} from "@/lib/types";

type CashflowTransaction = IncomeTransaction | SavingsTransferTransaction;

interface CashflowListProps {
  onEdit: (transaction: CashflowTransaction) => void;
}

export default function CashflowList({ onEdit }: CashflowListProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg bg-canvas-soft px-4 py-12 text-center text-sm text-body shadow-card">
          Loading cashflow...
        </div>
      }
    >
      <CashflowListContent onEdit={onEdit} />
    </Suspense>
  );
}

function CashflowListContent({ onEdit }: CashflowListProps) {
  const { subscriptions, transactions } = useExpenses();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");

  const sorted = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.createdAt < b.createdAt ? 1 : -1;
      }),
    [transactions],
  );

  const months = useMemo(() => {
    const monthSet = new Set<string>([currentMonth()]);
    for (const transaction of sorted) {
      const month = monthFromDate(transaction.date);
      if (month) monthSet.add(month);
    }
    for (const subscription of subscriptions) {
      const month = monthFromDate(subscription.nextBillingDate);
      if (month) monthSet.add(month);
    }
    return [...monthSet].sort((a, b) => (a < b ? 1 : -1));
  }, [sorted, subscriptions]);

  const selectedMonth =
    months.find((month) => month === monthParam) ?? months[0] ?? currentMonth();
  const selectedIndex = months.findIndex((month) => month === selectedMonth);
  const previousMonth = months[selectedIndex + 1] ?? null;
  const nextMonth = months[selectedIndex - 1] ?? null;
  const cashflowTransactions = sorted.filter(
    (transaction): transaction is CashflowTransaction =>
      isCashflowTransaction(transaction) &&
      transaction.date.startsWith(selectedMonth),
  );
  const incomeTotal = cashflowTransactions.reduce(
    (total, transaction) =>
      transaction.type === "income" ? total + transaction.amount : total,
    0,
  );
  const savedTotal = cashflowTransactions.reduce(
    (total, transaction) =>
      transaction.type === "savings_transfer"
        ? total + transaction.amount
        : total,
    0,
  );
  const subscriptionTotal = subscriptions.reduce(
    (total, subscription) =>
      total + projectedSubscriptionAmount(subscription, selectedMonth),
    0,
  );

  useEffect(() => {
    if (monthParam === selectedMonth) return;
    router.replace(hrefWithParam(pathname, searchParams, "month", selectedMonth), {
      scroll: false,
    });
  }, [monthParam, pathname, router, searchParams, selectedMonth]);

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
              {formatMonth(selectedMonth)}
            </h2>
            <p className="mt-1 text-sm text-body">
              <span className="font-mono tabular-nums text-ink">
                {formatCurrency(incomeTotal)}
              </span>{" "}
              income ·{" "}
              <span className="font-mono tabular-nums text-ink">
                {formatCurrency(savedTotal)}
              </span>{" "}
              saved ·{" "}
              <span className="font-mono tabular-nums text-ink">
                {formatCurrency(subscriptionTotal)}
              </span>{" "}
              subscriptions
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <label className="sr-only" htmlFor="cashflow-month">
              Select cashflow month
            </label>
            <select
              id="cashflow-month"
              value={selectedMonth}
              onChange={(event) => goToMonth(event.target.value)}
              className="h-9 rounded-sm border border-hairline bg-canvas px-3 text-sm text-ink outline-none focus:border-hairline-strong"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {formatMonth(month)}
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

      {cashflowTransactions.length === 0 ? (
        <div className="rounded-lg bg-canvas-soft px-4 py-12 text-center text-sm text-body shadow-card">
          No income or savings records for this month.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {cashflowTransactions.map((transaction) => (
            <CashflowItem
              key={transaction.id}
              transaction={transaction}
              onEdit={onEdit}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface CashflowItemProps {
  transaction: CashflowTransaction;
  onEdit: (transaction: CashflowTransaction) => void;
}

function CashflowItem({ transaction, onEdit }: CashflowItemProps) {
  const { deleteTransaction } = useExpenses();
  const title =
    transaction.type === "income"
      ? transaction.payer || transaction.category
      : transaction.destination;
  const badge =
    transaction.type === "income" ? transaction.category : "Savings transfer";
  const detail = [transaction.notes, formatDate(transaction.date)]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-center justify-between gap-4 rounded-md bg-canvas px-4 py-3 shadow-card">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-ink">{title}</span>
          <span
            className={`shrink-0 px-2 py-0.5 text-xs font-medium ${BADGE_CLASS}`}
          >
            {badge}
          </span>
        </div>
        <div className="mt-0.5 truncate text-sm text-body">{detail}</div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm font-medium tabular-nums text-ink">
          {formatCurrency(transaction.amount)}
        </span>
        <button
          type="button"
          onClick={() => onEdit(transaction)}
          className="rounded-sm px-2 py-1 text-sm text-body transition-colors hover:bg-canvas-soft-2 hover:text-ink"
          aria-label="Edit cashflow record"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => deleteTransaction(transaction.id)}
          className="rounded-sm px-2 py-1 text-sm text-error transition-colors hover:bg-error-soft"
          aria-label="Delete cashflow record"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function isCashflowTransaction(
  transaction: Transaction,
): transaction is CashflowTransaction {
  return transaction.type === "income" || transaction.type === "savings_transfer";
}

function monthFromDate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.slice(0, 7) : null;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

function projectedSubscriptionAmount(
  subscription: {
    nextBillingDate: string;
    amount: number;
    billingCycle: "monthly" | "yearly";
  },
  month: string,
) {
  if (subscription.billingCycle === "yearly") {
    return subscription.nextBillingDate.startsWith(month)
      ? subscription.amount
      : 0;
  }

  return hasMonthlyChargeInMonth(subscription.nextBillingDate, month)
    ? subscription.amount
    : 0;
}

function hasMonthlyChargeInMonth(nextBillingDate: string, month: string) {
  const parsedCharge = parseISODate(nextBillingDate);
  const parsedMonth = parseMonth(month);
  if (!parsedCharge || !parsedMonth) return false;

  const chargeMonthIndex = parsedCharge.year * 12 + parsedCharge.month - 1;
  const targetMonthIndex = parsedMonth.year * 12 + parsedMonth.month - 1;
  return targetMonthIndex >= chargeMonthIndex;
}

function parseISODate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function parseMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return null;
  return { year, month: monthNumber };
}

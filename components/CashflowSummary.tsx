"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useExpenses } from "@/lib/expenses-context";
import { formatCurrency } from "@/lib/format";

export default function CashflowSummary() {
  return (
    <Suspense
      fallback={
        <section className="rounded-lg bg-canvas p-5 shadow-card sm:p-6">
          <div className="py-8 text-center text-sm text-mute">
            Loading cashflow...
          </div>
        </section>
      }
    >
      <CashflowSummaryContent />
    </Suspense>
  );
}

function CashflowSummaryContent() {
  const { subscriptions, transactions } = useExpenses();
  const searchParams = useSearchParams();

  const stats = useMemo(() => {
    const month = selectedMonth(searchParams.get("month"));
    let income = 0;
    let expenseSpend = 0;
    let saved = 0;

    for (const transaction of transactions) {
      if (!transaction.date.startsWith(month)) continue;
      if (transaction.type === "income") income += transaction.amount;
      if (transaction.type === "expense") expenseSpend += transaction.amount;
      if (transaction.type === "savings_transfer") saved += transaction.amount;
    }

    const projectedSubscriptionSpend = subscriptions.reduce(
      (total, subscription) =>
        total + projectedSubscriptionAmount(subscription, month),
      0,
    );
    const spent = expenseSpend + projectedSubscriptionSpend;

    return [
      { label: "Income", value: income },
      { label: "Projected out", value: spent },
      { label: "Saved", value: saved },
      { label: "Remaining", value: income - spent - saved },
    ];
  }, [searchParams, subscriptions, transactions]);

  return (
    <section className="rounded-lg bg-canvas p-5 shadow-card sm:p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="font-mono text-xs uppercase tracking-wide text-mute">
              {stat.label}
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums tracking-tight text-ink sm:text-2xl">
              {formatCurrency(stat.value)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function selectedMonth(month: string | null) {
  if (month && /^\d{4}-\d{2}$/.test(month)) return month;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

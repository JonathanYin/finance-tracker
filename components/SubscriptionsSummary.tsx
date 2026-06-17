"use client";

import { useMemo } from "react";
import { BADGE_CLASS } from "@/lib/categories";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { useExpenses } from "@/lib/expenses-context";

function monthlyAmount(amount: number, billingCycle: "monthly" | "yearly") {
  return billingCycle === "monthly" ? amount : amount / 12;
}

export default function SubscriptionsSummary() {
  const { subscriptions } = useExpenses();

  const { monthlyTotal, yearlyTotal, nextSubscription } = useMemo(() => {
    const monthlyTotal = subscriptions.reduce(
      (total, subscription) =>
        total + monthlyAmount(subscription.amount, subscription.billingCycle),
      0,
    );
    const today = todayISO();
    const sortedUpcoming = [...subscriptions].sort((a, b) => {
      if (a.nextBillingDate !== b.nextBillingDate) {
        return a.nextBillingDate > b.nextBillingDate ? 1 : -1;
      }
      return a.createdAt > b.createdAt ? 1 : -1;
    });
    const nextSubscription =
      sortedUpcoming.find((subscription) => subscription.nextBillingDate >= today) ??
      sortedUpcoming[0] ??
      null;

    return {
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      nextSubscription,
    };
  }, [subscriptions]);

  return (
    <section className="rounded-lg bg-canvas p-5 shadow-card sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <div className="font-mono text-xs uppercase tracking-wide text-mute">
            Monthly run rate
          </div>
          <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums tracking-tight text-ink sm:text-2xl">
            {formatCurrency(monthlyTotal)}
          </div>
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-wide text-mute">
            Yearly run rate
          </div>
          <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums tracking-tight text-ink sm:text-2xl">
            {formatCurrency(yearlyTotal)}
          </div>
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-wide text-mute">
            Next charge
          </div>
          <div className="mt-1.5 truncate text-sm font-medium text-ink">
            {nextSubscription ? nextSubscription.name : "No subscriptions"}
          </div>
          {nextSubscription && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-body">
              <span>{formatDate(nextSubscription.nextBillingDate)}</span>
              <span className={`px-2 py-0.5 font-medium ${BADGE_CLASS}`}>
                {formatCurrency(nextSubscription.amount)}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

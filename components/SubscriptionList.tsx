"use client";

import { useMemo } from "react";
import { BADGE_CLASS } from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import { useExpenses } from "@/lib/expenses-context";
import type { Subscription } from "@/lib/types";

interface SubscriptionListProps {
  onEdit: (subscription: Subscription) => void;
}

export default function SubscriptionList({ onEdit }: SubscriptionListProps) {
  const { subscriptions, deleteSubscription } = useExpenses();

  const sorted = useMemo(
    () =>
      [...subscriptions].sort((a, b) => {
        if (a.nextBillingDate !== b.nextBillingDate) {
          return a.nextBillingDate > b.nextBillingDate ? 1 : -1;
        }
        return a.createdAt > b.createdAt ? 1 : -1;
      }),
    [subscriptions],
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg bg-canvas-soft px-4 py-12 text-center text-sm text-body shadow-card">
        No subscriptions yet. Add your first one above.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((subscription) => (
        <li
          key={subscription.id}
          className="flex flex-col gap-3 rounded-md bg-canvas px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium text-ink">
                {subscription.name}
              </span>
              <span
                className={`shrink-0 px-2 py-0.5 text-xs font-medium ${BADGE_CLASS}`}
              >
                {subscription.category}
              </span>
              <span
                className={`shrink-0 px-2 py-0.5 text-xs font-medium ${BADGE_CLASS}`}
              >
                {subscription.billingCycle}
              </span>
            </div>
            <div className="mt-0.5 truncate text-sm text-body">
              {[
                subscription.merchant,
                `Next ${formatDate(subscription.nextBillingDate)}`,
                subscription.notes,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
            <span className="font-mono text-sm font-medium tabular-nums text-ink">
              {formatCurrency(subscription.amount)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(subscription)}
                className="rounded-sm px-2 py-1 text-sm text-body transition-colors hover:bg-canvas-soft-2 hover:text-ink"
                aria-label="Edit subscription"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => deleteSubscription(subscription.id)}
                className="rounded-sm px-2 py-1 text-sm text-error transition-colors hover:bg-error-soft"
                aria-label="Delete subscription"
              >
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

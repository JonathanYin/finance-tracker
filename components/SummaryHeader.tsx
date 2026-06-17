"use client";

import { useMemo } from "react";
import { useExpenses } from "@/lib/expenses-context";
import { BADGE_CLASS } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import type { Category } from "@/lib/types";

export default function SummaryHeader() {
  const { expenses } = useExpenses();

  const { stats, byCategory } = useMemo(() => {
    const now = new Date();
    const yearPrefix = String(now.getFullYear());
    const monthPrefix = `${yearPrefix}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let total = 0;
    let monthTotal = 0;
    let yearTotal = 0;
    const byCategory = new Map<Category, number>();

    for (const e of expenses) {
      total += e.amount;
      if (e.date.startsWith(monthPrefix)) monthTotal += e.amount;
      if (e.date.startsWith(yearPrefix)) yearTotal += e.amount;
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    }

    const sortedCategories = [...byCategory.entries()].sort(
      (a, b) => b[1] - a[1],
    );

    const stats = [
      { label: "Total spent", value: total },
      { label: "This year", value: yearTotal },
      { label: "This month", value: monthTotal },
    ];

    return { stats, byCategory: sortedCategories };
  }, [expenses]);

  return (
    <section className="rounded-lg bg-canvas p-5 shadow-card sm:p-6">
      <div className="grid grid-cols-3 gap-4">
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

      {byCategory.length > 0 && (
        <div className="mt-5 border-t border-hairline pt-5">
          <div className="mb-3 font-mono text-xs uppercase tracking-wide text-mute">
            By category
          </div>
          <div className="flex flex-wrap gap-2">
            {byCategory.map(([category, amount]) => (
              <span
                key={category}
                className={`px-2.5 py-1 text-xs font-medium ${BADGE_CLASS}`}
              >
                {category}{" "}
                <span className="font-mono tabular-nums text-ink">
                  {formatCurrency(amount)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

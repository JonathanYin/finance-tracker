"use client";

import { useState } from "react";
import { useExpenses } from "@/lib/expenses-context";
import SummaryHeader from "@/components/SummaryHeader";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import SubscriptionForm from "@/components/SubscriptionForm";
import SubscriptionList from "@/components/SubscriptionList";
import SubscriptionsSummary from "@/components/SubscriptionsSummary";
import ThemeToggle from "@/components/ThemeToggle";
import IntegrationsPanel from "@/components/IntegrationsPanel";
import type { Subscription, Transaction } from "@/lib/types";

type ActiveTab = "expenses" | "subscriptions";

export default function Home() {
  const { hydrated, error } = useExpenses();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("expenses");

  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    setEditing(null);
    setEditingSubscription(null);
  }

  const tabClass = (tab: ActiveTab) =>
    [
      "h-9 rounded-sm px-3 text-sm font-medium transition-colors",
      activeTab === tab
        ? "bg-ink text-on-primary"
        : "text-body hover:bg-canvas-soft-2 hover:text-ink",
    ].join(" ");

  return (
    <>
      <ThemeToggle />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
              Finance Tracker
            </h1>
            <p className="text-sm text-body">
              Track expenses and recurring subscriptions.
            </p>
          </div>
          <div
            className="grid w-full grid-cols-2 gap-1 rounded-md border border-hairline bg-canvas p-1 shadow-card sm:w-auto"
            aria-label="Finance views"
          >
            <button
              type="button"
              onClick={() => selectTab("expenses")}
              className={tabClass("expenses")}
              aria-pressed={activeTab === "expenses"}
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => selectTab("subscriptions")}
              className={tabClass("subscriptions")}
              aria-pressed={activeTab === "subscriptions"}
            >
              Subscriptions
            </button>
          </div>
        </header>

        {!hydrated ? (
          <div className="py-20 text-center text-sm text-mute">Loading...</div>
        ) : (
          <div className="flex flex-col gap-6">
            {error && (
              <div className="rounded-sm border border-error-soft bg-canvas px-3 py-2 text-sm text-error">
                {error}
              </div>
            )}

            {activeTab === "expenses" ? (
              <>
                <SummaryHeader />
                <IntegrationsPanel />
                <ExpenseForm
                  key={editing?.id ?? "new"}
                  editing={editing}
                  onDone={() => setEditing(null)}
                />
                <ExpenseList onEdit={setEditing} />
              </>
            ) : (
              <>
                <SubscriptionsSummary />
                <SubscriptionForm
                  key={editingSubscription?.id ?? "new"}
                  editing={editingSubscription}
                  onDone={() => setEditingSubscription(null)}
                />
                <SubscriptionList onEdit={setEditingSubscription} />
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}

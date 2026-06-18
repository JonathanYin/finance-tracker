"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useExpenses } from "@/lib/expenses-context";
import { hrefWithParam } from "@/lib/url-params";
import SummaryHeader from "@/components/SummaryHeader";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import SubscriptionForm from "@/components/SubscriptionForm";
import SubscriptionList from "@/components/SubscriptionList";
import SubscriptionsSummary from "@/components/SubscriptionsSummary";
import ThemeToggle from "@/components/ThemeToggle";
import AccountControl from "@/components/AccountControl";
import type { Expense, Subscription } from "@/lib/types";

type ActiveTab = "expenses" | "subscriptions";

export default function Home() {
  const { hydrated } = useExpenses();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("expenses");

  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    setEditing(null);
    setEditingSubscription(null);
  }

  return (
    <>
      <ThemeToggle />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
              Finance Tracker
            </h1>
            <p className="text-sm text-body">
              Track expenses and recurring subscriptions.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AccountControl />
            <FinanceTabs activeTab={activeTab} onSelectTab={selectTab} />
          </div>
        </header>

        {!hydrated ? (
          <div className="py-20 text-center text-sm text-mute">Loading…</div>
        ) : activeTab === "expenses" ? (
          <div className="flex flex-col gap-6">
            <SummaryHeader />
            <ExpenseForm
              key={editing?.id ?? "new"}
              editing={editing}
              onDone={() => setEditing(null)}
            />
            <ExpenseList onEdit={setEditing} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <SubscriptionsSummary />
            <SubscriptionForm
              key={editingSubscription?.id ?? "new"}
              editing={editingSubscription}
              onDone={() => setEditingSubscription(null)}
            />
            <SubscriptionList onEdit={setEditingSubscription} />
          </div>
        )}
      </main>
    </>
  );
}

interface FinanceTabsProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

function FinanceTabs(props: FinanceTabsProps) {
  return (
    <Suspense
      fallback={
        <TabButtons
          activeTab={props.activeTab}
          onSelectTab={props.onSelectTab}
        />
      }
    >
      <FinanceTabsWithUrl {...props} />
    </Suspense>
  );
}

function FinanceTabsWithUrl({ activeTab, onSelectTab }: FinanceTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSelectTab(tab: ActiveTab) {
    onSelectTab(tab);
    if (tab === "subscriptions" && searchParams.has("month")) {
      router.replace(hrefWithParam(pathname, searchParams, "month", null), {
        scroll: false,
      });
    }
  }

  return <TabButtons activeTab={activeTab} onSelectTab={handleSelectTab} />;
}

function TabButtons({ activeTab, onSelectTab }: FinanceTabsProps) {
  const tabClass = (tab: ActiveTab) =>
    [
      "h-9 rounded-sm px-3 text-sm font-medium transition-colors",
      activeTab === tab
        ? "bg-ink text-on-primary"
        : "text-body hover:bg-canvas-soft-2 hover:text-ink",
    ].join(" ");

  return (
    <div
      className="grid w-full grid-cols-2 gap-1 rounded-md border border-hairline bg-canvas p-1 shadow-card sm:w-auto"
      aria-label="Finance views"
    >
      <button
        type="button"
        onClick={() => onSelectTab("expenses")}
        className={tabClass("expenses")}
        aria-pressed={activeTab === "expenses"}
      >
        Expenses
      </button>
      <button
        type="button"
        onClick={() => onSelectTab("subscriptions")}
        className={tabClass("subscriptions")}
        aria-pressed={activeTab === "subscriptions"}
      >
        Subscriptions
      </button>
    </div>
  );
}

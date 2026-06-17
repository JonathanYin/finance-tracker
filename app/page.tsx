"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useExpenses } from "@/lib/expenses-context";
import { hrefWithParam } from "@/lib/url-params";
import SummaryHeader from "@/components/SummaryHeader";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import CashflowForm from "@/components/CashflowForm";
import CashflowList from "@/components/CashflowList";
import CashflowSummary from "@/components/CashflowSummary";
import SubscriptionForm from "@/components/SubscriptionForm";
import SubscriptionList from "@/components/SubscriptionList";
import SubscriptionsSummary from "@/components/SubscriptionsSummary";
import ThemeToggle from "@/components/ThemeToggle";
import type {
  Expense,
  IncomeTransaction,
  SavingsTransferTransaction,
  Subscription,
} from "@/lib/types";

type ActiveTab = "expenses" | "cashflow" | "subscriptions";
type CashflowTransaction = IncomeTransaction | SavingsTransferTransaction;

export default function Home() {
  const { hydrated } = useExpenses();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [editingCashflow, setEditingCashflow] =
    useState<CashflowTransaction | null>(null);
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("expenses");

  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    setEditing(null);
    setEditingCashflow(null);
    setEditingSubscription(null);
  }

  return (
    <>
      <ThemeToggle />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="mb-8 flex flex-col gap-5">
          <div>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
              Finance Tracker
            </h1>
            <p className="text-sm text-body">
              Track spending, income, savings, and recurring subscriptions.
            </p>
          </div>
          <FinanceTabs activeTab={activeTab} onSelectTab={selectTab} />
        </header>

        {!hydrated ? (
          <div className="py-20 text-center text-sm text-mute">Loading…</div>
        ) : activeTab === "expenses" ? (
          <DashboardTab
            summary={<SummaryHeader />}
            form={
              <ExpenseForm
                key={editing?.id ?? "new"}
                editing={editing}
                onDone={() => setEditing(null)}
              />
            }
            list={<ExpenseList onEdit={setEditing} />}
          />
        ) : activeTab === "cashflow" ? (
          <DashboardTab
            summary={<CashflowSummary />}
            form={
              <CashflowForm
                key={editingCashflow?.id ?? "new"}
                editing={editingCashflow}
                onDone={() => setEditingCashflow(null)}
              />
            }
            list={<CashflowList onEdit={setEditingCashflow} />}
          />
        ) : (
          <DashboardTab
            summary={<SubscriptionsSummary />}
            form={
              <SubscriptionForm
                key={editingSubscription?.id ?? "new"}
                editing={editingSubscription}
                onDone={() => setEditingSubscription(null)}
              />
            }
            list={<SubscriptionList onEdit={setEditingSubscription} />}
          />
        )}
      </main>
    </>
  );
}

interface DashboardTabProps {
  summary: React.ReactNode;
  form: React.ReactNode;
  list: React.ReactNode;
}

function DashboardTab({ summary, form, list }: DashboardTabProps) {
  return (
    <div className="flex flex-col gap-6">
      {summary}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <aside className="min-w-0 order-1 lg:order-2">{form}</aside>
        <div className="min-w-0 order-2 lg:order-1">{list}</div>
      </div>
    </div>
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
      "h-9 min-w-0 rounded-sm px-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
      activeTab === tab
        ? "bg-ink text-on-primary"
        : "text-body hover:bg-canvas-soft-2 hover:text-ink",
    ].join(" ");

  return (
    <div
      className="grid w-full grid-cols-3 gap-1 rounded-md border border-hairline bg-canvas p-1 shadow-card"
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
        onClick={() => onSelectTab("cashflow")}
        className={tabClass("cashflow")}
        aria-pressed={activeTab === "cashflow"}
      >
        Cashflow
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

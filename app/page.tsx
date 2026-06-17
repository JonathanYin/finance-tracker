"use client";

import { useState } from "react";
import { useExpenses } from "@/lib/expenses-context";
import SummaryHeader from "@/components/SummaryHeader";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import type { Expense } from "@/lib/types";

export default function Home() {
  const { hydrated } = useExpenses();
  const [editing, setEditing] = useState<Expense | null>(null);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        Finance Tracker
      </h1>
      <p className="mb-8 text-sm text-body">Track your expenses.</p>

      {!hydrated ? (
        <div className="py-20 text-center text-sm text-mute">Loading…</div>
      ) : (
        <div className="flex flex-col gap-6">
          <SummaryHeader />
          <ExpenseForm editing={editing} onDone={() => setEditing(null)} />
          <ExpenseList onEdit={setEditing} />
        </div>
      )}
    </main>
  );
}

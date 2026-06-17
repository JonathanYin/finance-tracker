"use client";

import { useState } from "react";
import { useExpenses } from "@/lib/expenses-context";
import { CATEGORIES } from "@/lib/categories";
import { todayISO } from "@/lib/format";
import type { Category, Transaction, TransactionType } from "@/lib/types";

interface ExpenseFormProps {
  editing: Transaction | null;
  onDone: () => void;
}

const emptyForm = () => ({
  amount: "",
  date: todayISO(),
  category: "Food" as Category,
  description: "",
  merchant: "",
  type: "expense" as TransactionType,
});

function formFromTransaction(transaction: Transaction | null) {
  if (!transaction) return emptyForm();

  return {
    amount: String(transaction.amount),
    date: transaction.date,
    category: transaction.category,
    description: transaction.description,
    merchant: transaction.merchant,
    type: transaction.type,
  };
}

export default function ExpenseForm({ editing, onDone }: ExpenseFormProps) {
  const { addTransaction, updateTransaction } = useExpenses();
  const [form, setForm] = useState(() => formFromTransaction(editing));
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (!form.date) {
      setError("Please pick a date.");
      return;
    }

    const input = {
      amount,
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      merchant: form.merchant.trim(),
      type: form.type,
    };

    try {
      if (editing) {
        await updateTransaction(editing.id, input);
      } else {
        await addTransaction(input);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save transaction.");
      return;
    }

    setForm(emptyForm());
    setError(null);
    onDone();
  }

  const inputClass =
    "h-10 w-full rounded-sm border border-hairline bg-canvas px-3 text-sm text-ink outline-none placeholder:text-mute focus:border-hairline-strong";
  const labelClass = "text-xs font-medium tracking-wide text-mute";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg bg-canvas p-4 shadow-card sm:p-5"
    >
      <h2 className="mb-4 text-base font-semibold tracking-tight text-ink">
        {editing ? "Edit transaction" : "Add transaction"}
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Type</span>
          <select
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as TransactionType })
            }
            className={inputClass}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Amount</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className={inputClass}
            required
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Date</span>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={inputClass}
            required
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Category</span>
          <select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as Category })
            }
            className={inputClass}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Merchant</span>
          <input
            type="text"
            placeholder="e.g. Target"
            value={form.merchant}
            onChange={(e) => setForm({ ...form, merchant: e.target.value })}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className={labelClass}>Description</span>
          <input
            type="text"
            placeholder="What was it for?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          className="h-10 rounded-sm bg-ink px-4 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
        >
          {editing ? "Save changes" : "Add transaction"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={onDone}
            className="h-10 rounded-sm border border-hairline bg-canvas px-4 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft-2"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

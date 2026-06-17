"use client";

import { useEffect, useState } from "react";
import { useExpenses } from "@/lib/expenses-context";
import { CATEGORIES } from "@/lib/categories";
import { todayISO } from "@/lib/format";
import type { Category, Expense } from "@/lib/types";

interface ExpenseFormProps {
  /** When set, the form edits this expense instead of adding a new one. */
  editing: Expense | null;
  /** Called after a successful submit or cancel, to clear edit state. */
  onDone: () => void;
}

const emptyForm = () => ({
  amount: "",
  date: todayISO(),
  category: "Food" as Category,
  description: "",
  merchant: "",
});

export default function ExpenseForm({ editing, onDone }: ExpenseFormProps) {
  const { addExpense, updateExpense } = useExpenses();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  // Load the editing expense into the form (or reset when it clears).
  useEffect(() => {
    if (editing) {
      setForm({
        amount: String(editing.amount),
        date: editing.date,
        category: editing.category,
        description: editing.description,
        merchant: editing.merchant,
      });
    } else {
      setForm(emptyForm());
    }
    setError(null);
  }, [editing]);

  function handleSubmit(e: React.FormEvent) {
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
    };

    if (editing) {
      updateExpense(editing.id, input);
    } else {
      addExpense(input);
    }
    setForm(emptyForm());
    setError(null);
    onDone();
  }

  // form-input: canvas surface, hairline border, 6px radius, ~40px tall
  const inputClass =
    "h-10 w-full rounded-sm border border-hairline bg-canvas px-3 text-sm text-ink outline-none transition-colors placeholder:text-mute focus:border-hairline-strong";

  const labelClass = "text-xs font-medium tracking-wide text-mute";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg bg-canvas p-4 shadow-card sm:p-5"
    >
      <h2 className="mb-4 text-base font-semibold tracking-tight text-ink">
        {editing ? "Edit expense" : "Add expense"}
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
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
          {editing ? "Save changes" : "Add expense"}
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

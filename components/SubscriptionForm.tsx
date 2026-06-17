"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { todayISO } from "@/lib/format";
import { useExpenses } from "@/lib/expenses-context";
import type {
  BillingCycle,
  Category,
  Subscription,
  SubscriptionInput,
} from "@/lib/types";

interface SubscriptionFormProps {
  editing: Subscription | null;
  onDone: () => void;
}

const emptyForm = () => ({
  name: "",
  amount: "",
  billingCycle: "monthly" as BillingCycle,
  nextBillingDate: todayISO(),
  category: "Bills" as Category,
  merchant: "",
  notes: "",
});

function formFromSubscription(subscription: Subscription | null) {
  if (!subscription) return emptyForm();

  return {
    name: subscription.name,
    amount: String(subscription.amount),
    billingCycle: subscription.billingCycle,
    nextBillingDate: subscription.nextBillingDate,
    category: subscription.category,
    merchant: subscription.merchant,
    notes: subscription.notes,
  };
}

export default function SubscriptionForm({
  editing,
  onDone,
}: SubscriptionFormProps) {
  const { addSubscription, updateSubscription } = useExpenses();
  const [form, setForm] = useState(() => formFromSubscription(editing));
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (!form.nextBillingDate) {
      setError("Please pick the next billing date.");
      return;
    }

    const input: SubscriptionInput = {
      name: form.name.trim(),
      amount,
      billingCycle: form.billingCycle,
      nextBillingDate: form.nextBillingDate,
      category: form.category,
      merchant: form.merchant.trim(),
      notes: form.notes.trim(),
    };

    if (editing) {
      updateSubscription(editing.id, input);
    } else {
      addSubscription(input);
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
        {editing ? "Edit subscription" : "Add subscription"}
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Name</span>
          <input
            type="text"
            placeholder="e.g. Netflix"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            required
          />
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
          <span className={labelClass}>Billing cycle</span>
          <select
            value={form.billingCycle}
            onChange={(e) =>
              setForm({ ...form, billingCycle: e.target.value as BillingCycle })
            }
            className={inputClass}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Next billing date</span>
          <input
            type="date"
            value={form.nextBillingDate}
            onChange={(e) =>
              setForm({ ...form, nextBillingDate: e.target.value })
            }
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
            placeholder="e.g. Apple"
            value={form.merchant}
            onChange={(e) => setForm({ ...form, merchant: e.target.value })}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className={labelClass}>Notes</span>
          <input
            type="text"
            placeholder="Plan, renewal details, or cancellation note"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
          {editing ? "Save changes" : "Add subscription"}
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

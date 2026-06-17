"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { INCOME_CATEGORIES, SAVINGS_DESTINATIONS } from "@/lib/categories";
import { useExpenses } from "@/lib/expenses-context";
import { todayISO } from "@/lib/format";
import { hrefWithParam } from "@/lib/url-params";
import type {
  IncomeCategory,
  IncomeTransaction,
  SavingsDestination,
  SavingsTransferTransaction,
  TransactionInput,
} from "@/lib/types";

type CashflowTransaction = IncomeTransaction | SavingsTransferTransaction;
type CashflowType = CashflowTransaction["type"];

interface CashflowFormProps {
  editing: CashflowTransaction | null;
  onDone: () => void;
}

const emptyForm = () => ({
  type: "income" as CashflowType,
  amount: "",
  date: todayISO(),
  category: "Salary" as IncomeCategory,
  payer: "",
  destination: "Schwab" as SavingsDestination,
  notes: "",
});

function formFromTransaction(transaction: CashflowTransaction | null) {
  if (!transaction) return emptyForm();

  return {
    type: transaction.type,
    amount: String(transaction.amount),
    date: transaction.date,
    category:
      transaction.type === "income"
        ? transaction.category
        : ("Salary" as IncomeCategory),
    payer: transaction.type === "income" ? transaction.payer : "",
    destination:
      transaction.type === "savings_transfer"
        ? transaction.destination
        : ("Schwab" as SavingsDestination),
    notes: transaction.notes,
  };
}

export default function CashflowForm(props: CashflowFormProps) {
  return (
    <Suspense>
      <CashflowFormContent {...props} />
    </Suspense>
  );
}

function CashflowFormContent({ editing, onDone }: CashflowFormProps) {
  const { addTransaction, updateTransaction } = useExpenses();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState(() => formFromTransaction(editing));
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (!form.date) {
      setError("Please pick a date.");
      return;
    }

    const input: TransactionInput =
      form.type === "income"
        ? {
            type: "income",
            amount,
            date: form.date,
            category: form.category,
            payer: form.payer.trim(),
            notes: form.notes.trim(),
          }
        : {
            type: "savings_transfer",
            amount,
            date: form.date,
            destination: form.destination,
            notes: form.notes.trim(),
          };

    if (editing) {
      updateTransaction(editing.id, input);
    } else {
      addTransaction(input);
    }

    setForm(emptyForm());
    setError(null);
    const savedMonth = monthFromDate(input.date);
    if (savedMonth) {
      router.replace(hrefWithParam(pathname, searchParams, "month", savedMonth), {
        scroll: false,
      });
    }
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
        {editing ? "Edit cashflow" : "Add income or savings"}
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Type</span>
          <select
            value={form.type}
            onChange={(event) =>
              setForm({ ...form, type: event.target.value as CashflowType })
            }
            className={inputClass}
          >
            <option value="income">Income</option>
            <option value="savings_transfer">Savings transfer</option>
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
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
            className={inputClass}
            required
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Date</span>
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            className={inputClass}
            required
          />
        </label>

        {form.type === "income" ? (
          <>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className={labelClass}>Category</span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({
                    ...form,
                    category: event.target.value as IncomeCategory,
                  })
                }
                className={inputClass}
              >
                {INCOME_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className={labelClass}>Payer</span>
              <input
                type="text"
                placeholder="e.g. Employer"
                value={form.payer}
                onChange={(event) =>
                  setForm({ ...form, payer: event.target.value })
                }
                className={inputClass}
              />
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className={labelClass}>Destination</span>
            <select
              value={form.destination}
              onChange={(event) =>
                setForm({
                  ...form,
                  destination: event.target.value as SavingsDestination,
                })
              }
              className={inputClass}
            >
              {SAVINGS_DESTINATIONS.map((destination) => (
                <option key={destination} value={destination}>
                  {destination}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className={labelClass}>Notes</span>
          <input
            type="text"
            placeholder="Optional context"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
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
          {editing ? "Save changes" : "Add record"}
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

function monthFromDate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.slice(0, 7) : null;
}

import { importTransactions } from "@/lib/server-store";
import type { Expense, ImportTransactionInput } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { expenses?: Expense[] };
  const legacyExpenses = Array.isArray(body.expenses) ? body.expenses : [];
  const inputs: ImportTransactionInput[] = legacyExpenses.map((expense) => ({
    amount: expense.amount,
    date: expense.date,
    category: expense.category,
    description: expense.description,
    merchant: expense.merchant,
    type: expense.type ?? "expense",
    source: expense.source ?? "manual",
    sourceId: expense.id,
    reviewStatus: expense.reviewStatus ?? "accepted",
  }));

  const transactions = await importTransactions(inputs);
  return Response.json({ transactions });
}

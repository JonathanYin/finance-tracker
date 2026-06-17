import {
  createTransaction,
  importTransactions,
  listTransactions,
} from "@/lib/server-store";
import type { ImportTransactionInput } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const transactions = await listTransactions();
  return Response.json({ transactions });
}

export async function POST(request: Request) {
  const body = (await request.json()) as
    | ImportTransactionInput
    | { transactions: ImportTransactionInput[] };

  if ("transactions" in body) {
    const transactions = await importTransactions(body.transactions);
    return Response.json({ transactions }, { status: 201 });
  }

  const transaction = await createTransaction({
    ...body,
    source: body.source ?? "manual",
    reviewStatus: body.reviewStatus ?? "accepted",
  });
  return Response.json({ transaction }, { status: 201 });
}

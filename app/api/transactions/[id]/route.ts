import { deleteTransaction, updateTransaction } from "@/lib/server-store";
import type { TransactionInput } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(request: Request, ctx: RouteContext<"/api/transactions/[id]">) {
  const { id } = await ctx.params;
  const body = (await request.json()) as TransactionInput;
  const transaction = await updateTransaction(id, body);

  if (!transaction) {
    return Response.json({ error: "Transaction not found." }, { status: 404 });
  }

  return Response.json({ transaction });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/transactions/[id]">) {
  const { id } = await ctx.params;
  const deleted = await deleteTransaction(id);

  if (!deleted) {
    return Response.json({ error: "Transaction not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}

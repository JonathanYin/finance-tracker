import { createImportDraft, importTransactions } from "@/lib/server-store";
import { todayISO } from "@/lib/format";
import type { ImportTransactionInput } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("receipt");
  const merchant = String(formData.get("merchant") ?? "").trim();
  const amount = Number.parseFloat(String(formData.get("amount") ?? ""));
  const date = String(formData.get("date") ?? todayISO());

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing receipt file." }, { status: 400 });
  }

  const draft = await createImportDraft({
    source: "receipt",
    fileName: file.name,
    merchant,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    date,
    rawText:
      "OCR is not configured yet. Set Google Document AI credentials and wire this route to EXPENSE_PROCESSOR.",
    confidence: 0,
    reviewStatus: "needs_review",
  });

  const inputs: ImportTransactionInput[] =
    draft.amount > 0
      ? [
          {
            amount: draft.amount,
            date: draft.date,
            category: "Other",
            description: `Receipt upload: ${draft.fileName ?? "receipt"}`,
            merchant: draft.merchant,
            type: "expense",
            source: "receipt",
            sourceId: draft.id,
            reviewStatus: "needs_review",
          },
        ]
      : [];
  const transactions = inputs.length > 0 ? await importTransactions(inputs) : [];

  return Response.json({ draft, transactions });
}

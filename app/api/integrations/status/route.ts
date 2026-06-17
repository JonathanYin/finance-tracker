import { readFinanceData } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  const data = await readFinanceData();
  return Response.json({
    connectedAccounts: data.connectedAccounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      institutionName: account.institutionName,
      accountName: account.accountName,
      accountMask: account.accountMask,
      accountType: account.accountType,
      accountSubtype: account.accountSubtype,
      status: account.status,
      lastSyncedAt: account.lastSyncedAt,
      hasSyncCursor: Boolean(account.syncCursor),
    })),
    importDrafts: data.importDrafts.map((draft) => ({
      id: draft.id,
      source: draft.source,
      fileName: draft.fileName,
      merchant: draft.merchant,
      amount: draft.amount,
      date: draft.date,
      confidence: draft.confidence,
      reviewStatus: draft.reviewStatus,
      createdAt: draft.createdAt,
    })),
  });
}

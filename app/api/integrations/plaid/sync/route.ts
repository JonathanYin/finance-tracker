import { importTransactions, readFinanceData, upsertConnectedAccounts } from "@/lib/server-store";
import { isPlaidConfigured, syncPlaidItem } from "@/lib/plaid";

export const runtime = "nodejs";

export async function POST() {
  try {
    if (!isPlaidConfigured()) {
      return Response.json(
        { error: "Plaid is not configured.", imported: 0 },
        { status: 503 },
      );
    }

    const data = await readFinanceData();
    const accounts = data.connectedAccounts.filter(
      (account) => account.provider === "plaid" && account.status === "connected",
    );
    const inputs = [];
    const accountsByItem = new Map<string, typeof accounts>();

    for (const account of accounts) {
      const key = account.itemId ?? account.id;
      accountsByItem.set(key, [...(accountsByItem.get(key) ?? []), account]);
    }

    for (const itemAccounts of accountsByItem.values()) {
      const synced = await syncPlaidItem(itemAccounts);
      inputs.push(...synced.inputs);
      await upsertConnectedAccounts(
        itemAccounts.map((account) => ({
          ...account,
          syncCursor: synced.nextCursor,
          lastSyncedAt: new Date().toISOString(),
        })),
      );
    }

    const imported = await importTransactions(inputs);
    return Response.json({ imported: imported.length, transactions: imported });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Plaid sync failed.",
        imported: 0,
      },
      { status: 502 },
    );
  }
}

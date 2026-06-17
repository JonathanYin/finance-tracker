import { createPlaidLinkToken, isPlaidConfigured } from "@/lib/plaid";

export const runtime = "nodejs";

export async function POST() {
  if (!isPlaidConfigured()) {
    return Response.json(
      {
        error:
          "Plaid is not configured. Set PLAID_CLIENT_ID, PLAID_SECRET, and FINANCE_TRACKER_SECRET.",
      },
      { status: 503 },
    );
  }

  try {
    const token = await createPlaidLinkToken();
    return Response.json(token);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Plaid link failed." },
      { status: 502 },
    );
  }
}

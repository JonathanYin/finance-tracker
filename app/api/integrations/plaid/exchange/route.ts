import { exchangePlaidPublicToken } from "@/lib/plaid";
import { upsertConnectedAccounts } from "@/lib/server-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { public_token?: string };
  if (!body.public_token) {
    return Response.json({ error: "Missing public_token." }, { status: 400 });
  }

  try {
    const accounts = await exchangePlaidPublicToken(body.public_token);
    const connectedAccounts = await upsertConnectedAccounts(accounts);
    return Response.json({ connectedAccounts });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Plaid exchange failed." },
      { status: 502 },
    );
  }
}

import { resetFinanceData } from "@/lib/server-store";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "Local data reset is disabled in production." },
      { status: 403 },
    );
  }

  await resetFinanceData();
  return Response.json({ ok: true });
}

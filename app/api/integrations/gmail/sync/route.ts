export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    {
      error:
        "Gmail is not configured yet. This phase needs Google OAuth, restricted gmail.readonly scope review, and a token store.",
    },
    { status: 501 },
  );
}

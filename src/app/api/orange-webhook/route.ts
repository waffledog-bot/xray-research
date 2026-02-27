import { NextRequest, NextResponse } from "next/server";
import { getSessionByPaymentHash, markPaid, markComplete, markFailed } from "@/lib/db";
import { generateResearch } from "@/lib/research";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token !== process.env.ORANGE_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    event.type === "payment_received" &&
    typeof event.payment_hash === "string"
  ) {
    try {
      console.log("[orange-webhook] payment_received:", event.payment_hash);
      const session = await getSessionByPaymentHash(event.payment_hash);
      console.log("[orange-webhook] session lookup:", session?.id ?? "not found", session?.status);

      if (session && session.status === "pending") {
        await markPaid(session.id);
        console.log("[orange-webhook] marked paid, starting research for", session.id);

        try {
          const html = await generateResearch(session.params);
          await markComplete(session.id, html);
          console.log("[orange-webhook] research complete for", session.id);
        } catch (e) {
          console.error("[orange-webhook] research failed:", e);
          await markFailed(session.id);
        }
      }
    } catch (e) {
      // Log but don't 500 — orange daemon would retry, causing duplicate research
      console.error("[orange-webhook] unexpected error:", e);
    }
  }

  return NextResponse.json({ ok: true });
}

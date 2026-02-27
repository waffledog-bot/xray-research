import { NextRequest, NextResponse } from "next/server";
import { getSessionByPaymentHash, updateSession } from "@/lib/db";
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
    const session = await getSessionByPaymentHash(event.payment_hash);

    if (session && session.status === "pending") {
      await updateSession(session.id, { status: "paid" });

      // Generate research synchronously — function stays alive until done
      try {
        const html = await generateResearch(session.params);
        await updateSession(session.id, { status: "complete", result_html: html });
      } catch (e) {
        console.error("[orange-webhook] research failed:", e);
        await updateSession(session.id, { status: "failed" });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

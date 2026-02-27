import { NextRequest, NextResponse } from "next/server";
import { popOldestPending, updateSession } from "@/lib/db";
import { generateResearch } from "@/lib/research";

export async function POST(request: NextRequest) {
  // Verify auth token
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== process.env.ORANGE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type === "payment_received") {
    // FIFO: claim the oldest pending research session
    const sessionId = await popOldestPending();
    if (sessionId) {
      await updateSession(sessionId, { status: "paid" });

      // Generate research — Vercel functions can run up to 60s (Pro) or 10s (Hobby)
      // Using waitUntil pattern via background promise
      const sessionPromise = (async () => {
        try {
          const { getSession } = await import("@/lib/db");
          const session = await getSession(sessionId);
          if (!session) return;
          const html = await generateResearch(session.params);
          await updateSession(sessionId, { status: "complete", result_html: html });
        } catch (e) {
          console.error("[orange-webhook] research failed:", e);
          await updateSession(sessionId, { status: "failed" });
        }
      })();

      // Return 200 quickly; research runs in background
      // On Vercel Pro the function stays alive until the promise resolves
      await sessionPromise;
    }
  }

  return NextResponse.json({ ok: true });
}

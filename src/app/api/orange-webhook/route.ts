import { NextRequest, NextResponse } from "next/server";
import { getInvoiceByPaymentHash, markPaid, markComplete, markFailed } from "@/lib/db";
import { generateResearch, ResearchParams } from "@/lib/research";

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

  if (event.type === "payment_received" && typeof event.payment_hash === "string") {
    const invoice = getInvoiceByPaymentHash(event.payment_hash);

    if (invoice && invoice.status === "pending") {
      markPaid(invoice.id);

      // Generate research in background after responding
      const params = JSON.parse(invoice.params_json) as ResearchParams;
      const invoiceId = invoice.id;

      setImmediate(async () => {
        try {
          const html = await generateResearch(params);
          markComplete(invoiceId, html);
        } catch (e) {
          console.error("[orange-webhook] research failed:", e);
          markFailed(invoiceId);
        }
      });
    }
  }

  return NextResponse.json({ ok: true });
}

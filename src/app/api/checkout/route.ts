import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createInvoice as createOrangeInvoice } from "@/lib/orange";
import { createInvoice as createDbInvoice } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bolt11 = require("bolt11") as {
  decode: (payreq: string) => {
    tags: Array<{ tagName: string; data: unknown }>;
  };
};

export async function POST(request: NextRequest) {
  try {
    const params = await request.json();

    // Create invoice via orange daemon
    const orangeInvoice = await createOrangeInvoice(1000);

    // Extract payment hash from BOLT11
    const decoded = bolt11.decode(orangeInvoice.invoice);
    const paymentHashTag = decoded.tags.find(
      (t) => t.tagName === "payment_hash"
    );
    if (!paymentHashTag) {
      return NextResponse.json(
        { error: "Could not decode invoice" },
        { status: 500 }
      );
    }
    const paymentHash = paymentHashTag.data as string;

    // Store in DB
    const id = randomUUID();
    createDbInvoice({
      id,
      bolt11: orangeInvoice.invoice,
      payment_hash: paymentHash,
      amount_sats: 1000,
      params_json: JSON.stringify(params),
      created_at: Math.floor(Date.now() / 1000),
    });

    return NextResponse.json({ id, bolt11: orangeInvoice.invoice, amount_sats: 1000 });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

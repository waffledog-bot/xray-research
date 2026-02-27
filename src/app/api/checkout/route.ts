import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createSession } from "@/lib/db";
import type { ResearchParams } from "@/lib/research";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bolt11pkg = require("bolt11") as {
  decode: (payreq: string) => {
    tags: Array<{ tagName: string; data: unknown }>;
  };
};

const LIGHTNING_ADDRESS = process.env.LIGHTNING_ADDRESS || "xray@breez.tips";
const AMOUNT_SATS = 1000;
const AMOUNT_MSATS = AMOUNT_SATS * 1000;

async function fetchInvoice(lightningAddress: string, amountMsats: number) {
  // Step 1: resolve lightning address → LNURL-pay metadata
  const [name, domain] = lightningAddress.split("@");
  const metaUrl = `https://${domain}/.well-known/lnurlp/${name}`;
  const metaRes = await fetch(metaUrl);
  if (!metaRes.ok) throw new Error(`LNURL metadata fetch failed: ${metaRes.status}`);
  const meta = await metaRes.json();

  // Step 2: call callback with amount to get a real BOLT11 invoice
  const callbackUrl = `${meta.callback}?amount=${amountMsats}`;
  const invoiceRes = await fetch(callbackUrl);
  if (!invoiceRes.ok) throw new Error(`LNURL callback failed: ${invoiceRes.status}`);
  const invoiceData = await invoiceRes.json();
  if (invoiceData.status === "ERROR") throw new Error(invoiceData.reason);

  const pr: string = invoiceData.pr;

  // Step 3: decode BOLT11 to extract payment_hash for webhook correlation
  const decoded = bolt11pkg.decode(pr);
  const hashTag = decoded.tags.find((t) => t.tagName === "payment_hash");
  if (!hashTag) throw new Error("Could not decode payment hash from invoice");
  const paymentHash = hashTag.data as string;

  return { bolt11: pr, paymentHash };
}

export async function POST(request: NextRequest) {
  try {
    const params: ResearchParams = await request.json();

    const { bolt11, paymentHash } = await fetchInvoice(LIGHTNING_ADDRESS, AMOUNT_MSATS);

    const id = randomUUID();
    await createSession({
      id,
      params,
      payment_hash: paymentHash,
      bolt11,
      status: "pending",
      created_at: Date.now(),
    });

    return NextResponse.json({ id, bolt11, amount_sats: AMOUNT_SATS });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

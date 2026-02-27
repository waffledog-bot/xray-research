import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createSession } from "@/lib/db";
import type { ResearchParams } from "@/lib/research";

const LIGHTNING_ADDRESS =
  process.env.LIGHTNING_ADDRESS || "xray@breez.tips";
const AMOUNT_SATS = 1000;

export async function POST(request: NextRequest) {
  try {
    const params: ResearchParams = await request.json();
    const id = randomUUID();
    await createSession(id, params);
    return NextResponse.json({ id, lightning_address: LIGHTNING_ADDRESS, amount_sats: AMOUNT_SATS });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

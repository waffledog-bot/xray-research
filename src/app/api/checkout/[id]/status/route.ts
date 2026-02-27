import { NextRequest, NextResponse } from "next/server";
import { getInvoice } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoice = getInvoice(id);

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: invoice.id,
    status: invoice.status,
    bolt11: invoice.bolt11,
    amount_sats: invoice.amount_sats,
  });
}

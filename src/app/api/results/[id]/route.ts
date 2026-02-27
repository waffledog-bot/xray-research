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

  if (invoice.status === "complete" && invoice.result_html) {
    return NextResponse.json({ html: invoice.result_html, status: "complete" });
  }

  return NextResponse.json({ status: invoice.status });
}

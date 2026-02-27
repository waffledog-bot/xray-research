import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    status: session.status,
    bolt11: session.bolt11,
    amount_sats: 1000,
  });
}

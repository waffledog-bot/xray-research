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

  if (session.status === "complete" && session.result_html) {
    return NextResponse.json({ html: session.result_html, status: "complete" });
  }

  return NextResponse.json({ status: session.status });
}

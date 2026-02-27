import { NextRequest, NextResponse } from "next/server";
import { generateResearch, ResearchParams } from "@/lib/research";

export async function POST(request: NextRequest) {
  const params: ResearchParams = await request.json();
  try {
    const html = await generateResearch(params);
    return NextResponse.json({ html });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { callMdk } from "@/lib/mdk";

export const maxDuration = 300;

type MdkCheckout = {
  id: string;
  status: string;
  invoice?: {
    invoice: string;
    expiresAt: string;
    amountSats: number | null;
  } | null;
};

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { mode, query, side1, side2, handle, topics, question } = body as Record<string, string>;

  if (!mode) {
    return NextResponse.json({ error: "mode is required" }, { status: 400 });
  }

  // Build metadata for the success redirect
  const metadata: Record<string, string> = { mode };
  if (query) metadata.query = query;
  if (side1) metadata.side1 = side1;
  if (side2) metadata.side2 = side2;
  if (handle) metadata.handle = handle;
  if (topics) metadata.topics = topics;
  if (question) metadata.question = question;

  const successUrl = `/results?${new URLSearchParams(metadata).toString()}`;

  try {
    // Step 1: Create checkout
    const createResponse = await callMdk<{ data?: MdkCheckout }>({
      handler: "create_checkout",
      params: {
        type: "AMOUNT",
        title: `X-Ray Research Report`,
        description: `AI-powered X/Twitter ${mode} report`,
        amount: 1000,
        currency: "SAT",
        successUrl,
        metadata,
      },
    });

    const checkoutId = createResponse.data?.id;
    if (!checkoutId) {
      return NextResponse.json(
        { error: "Failed to create checkout" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      data: {
        checkoutId,
        checkoutUrl: `/checkout/${checkoutId}`,
      },
    });
  } catch (error) {
    console.error("create-checkout failed:", error);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}

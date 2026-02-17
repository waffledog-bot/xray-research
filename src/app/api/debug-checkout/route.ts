export const maxDuration = 300;

import { POST as mdkPost } from "@moneydevkit/nextjs/server/route";

export async function GET() {
  const t0 = Date.now();
  const steps: { step: string; ms: number }[] = [];
  const mark = (step: string) => steps.push({ step, ms: Date.now() - t0 });

  mark("start");

  try {
    // Build a synthetic request that mimics what useCheckout sends
    const csrfToken = "debug-token-12345";
    const body = {
      handler: "create_checkout",
      params: {
        type: "AMOUNT",
        amount: 1,
        currency: "SAT",
        title: "Debug test",
        description: "Debug timing test",
        successUrl: "/debug-success",
      },
    };

    const request = new Request("https://xray-research.vercel.app/api/mdk", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-moneydevkit-csrf-token": csrfToken,
        cookie: `mdk_csrf=${csrfToken}`,
        origin: "https://xray-research.vercel.app",
        host: "xray-research.vercel.app",
      },
      body: JSON.stringify(body),
    });

    mark("request_built");

    const response = await mdkPost(request);
    mark("mdk_responded");

    const json = await response.json().catch(() => null);
    mark("json_parsed");

    return Response.json({
      success: response.ok,
      status: response.status,
      mdkResponse: json,
      steps,
      totalMs: Date.now() - t0,
      platform: process.platform,
      arch: process.arch,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    mark("error");
    return Response.json(
      {
        success: false,
        error: message,
        stack: stack?.split("\n").slice(0, 10),
        steps,
        totalMs: Date.now() - t0,
        platform: process.platform,
        arch: process.arch,
      },
      { status: 500 }
    );
  }
}

import { POST as mdkPost } from "@moneydevkit/nextjs/server/route";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function callMdk<T>(payload: Record<string, unknown>): Promise<T> {
  const accessToken = process.env.MDK_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MDK_ACCESS_TOKEN is not configured");
  }

  const request = new Request("https://internal.mdk/api", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-moneydevkit-webhook-secret": accessToken,
    },
    body: JSON.stringify(payload),
  });

  const response = await mdkPost(request);
  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const error =
      isRecord(json) && typeof json.error === "string"
        ? json.error
        : `MDK request failed (${response.status})`;
    throw new Error(error);
  }

  return json as T;
}

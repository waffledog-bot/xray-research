import { POST as mdkPost } from "@moneydevkit/nextjs/server/route";
import { randomBytes } from "crypto";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Call MDK route handler server-side.
 * Routes using "secret" auth get the webhook secret header.
 * Routes using "csrf" auth (create_checkout, get_checkout, etc.) get
 * a synthetic CSRF cookie + header pair so the handler accepts them.
 */
export async function callMdk<T>(
  payload: Record<string, unknown>,
  auth: "secret" | "csrf" = "csrf"
): Promise<T> {
  const accessToken = process.env.MDK_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MDK_ACCESS_TOKEN is not configured");
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (auth === "secret") {
    headers["x-moneydevkit-webhook-secret"] = accessToken;
  } else {
    // CSRF auth: cookie and header must carry the same random token
    const csrfToken = randomBytes(32).toString("hex");
    headers["x-moneydevkit-csrf-token"] = csrfToken;
    headers["cookie"] = `mdk_csrf=${csrfToken}`;
    // origin + host must match so the origin check passes
    headers["origin"] = "https://internal.mdk";
    headers["host"] = "internal.mdk";
  }

  const request = new Request("https://internal.mdk/api", {
    method: "POST",
    headers,
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

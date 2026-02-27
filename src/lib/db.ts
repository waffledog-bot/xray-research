import { put } from "@vercel/blob";
import type { ResearchParams } from "./research";

export interface Session {
  id: string;
  params: ResearchParams;
  payment_hash: string;
  bolt11: string;
  status: "pending" | "paid" | "complete" | "failed";
  result_html?: string;
  created_at: number;
}

// Derive the blob store's CDN base URL from the token.
// Token format: vercel_blob_rw_{storeId}_{secretHash}
// CDN URL: https://{storeId}.public.blob.vercel-storage.com
function getBlobBaseUrl(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN ?? "";
  const match = token.match(/vercel_blob_rw_([^_]+)_/);
  if (!match) throw new Error("Cannot parse BLOB_READ_WRITE_TOKEN");
  return `https://${match[1]}.public.blob.vercel-storage.com`;
}

// Fetch a blob directly by pathname — avoids list() which has eventual consistency lag.
// We bypass Next.js cache with no-store, and bypass CDN cache with Cache-Control header.
async function fetchBlob(pathname: string): Promise<Response> {
  const url = `${getBlobBaseUrl()}/${pathname}`;
  return fetch(url, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache, no-store" },
  });
}

async function putJson(pathname: string, data: unknown): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

async function putSignal(pathname: string): Promise<void> {
  await put(pathname, "ok", {
    access: "public",
    addRandomSuffix: false,
    contentType: "text/plain",
  });
}

// ── Schema (immutable/append-only — blobs are NEVER overwritten) ─────────────
//
//   sessions/{id}.json          – written once on create (meta + bolt11 + params)
//   payment-hash/{hash}         – written once on create (→ session id)
//   sessions/{id}/paid          – signal blob, written when payment received
//   sessions/{id}/complete.json – written when research finishes (contains result_html)
//   sessions/{id}/failed        – signal blob, written if research fails
//
// Immutable writes mean we never have to invalidate CDN cache.
// ─────────────────────────────────────────────────────────────────────────────

export async function createSession(session: Session): Promise<void> {
  await putJson(`sessions/${session.id}.json`, {
    id: session.id,
    params: session.params,
    payment_hash: session.payment_hash,
    bolt11: session.bolt11,
    created_at: session.created_at,
  });
  await putJson(`payment-hash/${session.payment_hash}`, session.id);
}

export async function getSession(id: string): Promise<Session | null> {
  // Fetch meta and all status signals in parallel for speed.
  const [metaRes, completeRes, failedRes, paidRes] = await Promise.all([
    fetchBlob(`sessions/${id}.json`),
    fetchBlob(`sessions/${id}/complete.json`),
    fetchBlob(`sessions/${id}/failed`),
    fetchBlob(`sessions/${id}/paid`),
  ]);

  if (!metaRes.ok) return null; // session doesn't exist

  const meta = (await metaRes.json()) as Omit<Session, "status" | "result_html">;

  if (completeRes.ok) {
    const { result_html } = (await completeRes.json()) as {
      result_html: string;
    };
    return { ...meta, status: "complete", result_html };
  }
  if (failedRes.ok) return { ...meta, status: "failed" };
  if (paidRes.ok) return { ...meta, status: "paid" };
  return { ...meta, status: "pending" };
}

export async function getSessionByPaymentHash(
  paymentHash: string
): Promise<Session | null> {
  const res = await fetchBlob(`payment-hash/${paymentHash}`);
  if (!res.ok) return null;
  const id = (await res.json()) as string;
  return getSession(id);
}

// Instead of overwriting, write a new status signal blob.
export async function markPaid(id: string): Promise<void> {
  await putSignal(`sessions/${id}/paid`);
}

export async function markComplete(
  id: string,
  result_html: string
): Promise<void> {
  await putJson(`sessions/${id}/complete.json`, { result_html });
}

export async function markFailed(id: string): Promise<void> {
  await putSignal(`sessions/${id}/failed`);
}

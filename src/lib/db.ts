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
async function fetchBlob(pathname: string): Promise<Response> {
  const url = `${getBlobBaseUrl()}/${pathname}`;
  return fetch(url, { cache: "no-store" });
}

async function putJson(pathname: string, data: unknown): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

export async function createSession(session: Session): Promise<void> {
  await putJson(`sessions/${session.id}.json`, session);
  // Reverse lookup: payment_hash → session id (for webhook correlation)
  await putJson(`payment-hash/${session.payment_hash}`, session.id);
}

export async function getSession(id: string): Promise<Session | null> {
  const res = await fetchBlob(`sessions/${id}.json`);
  if (!res.ok) return null;
  return res.json();
}

export async function getSessionByPaymentHash(
  paymentHash: string
): Promise<Session | null> {
  const res = await fetchBlob(`payment-hash/${paymentHash}`);
  if (!res.ok) return null;
  const id = (await res.json()) as string;
  return getSession(id);
}

export async function updateSession(
  id: string,
  updates: Partial<Session>
): Promise<void> {
  const session = await getSession(id);
  if (!session) return;
  await putJson(`sessions/${id}.json`, { ...session, ...updates });
}

import { put, list, del } from "@vercel/blob";
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
  const { blobs } = await list({ prefix: `sessions/${id}.json` });
  if (!blobs.length) return null;
  const res = await fetch(blobs[0].url);
  if (!res.ok) return null;
  return res.json();
}

export async function getSessionByPaymentHash(
  paymentHash: string
): Promise<Session | null> {
  const { blobs } = await list({ prefix: `payment-hash/${paymentHash}` });
  if (!blobs.length) return null;
  const res = await fetch(blobs[0].url);
  if (!res.ok) return null;
  // The blob contains the session id as a JSON string
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

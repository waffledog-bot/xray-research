import { put, list, del } from "@vercel/blob";
import type { ResearchParams } from "./research";

export interface Session {
  id: string;
  params: ResearchParams;
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

export async function createSession(
  id: string,
  params: ResearchParams
): Promise<void> {
  const session: Session = {
    id,
    params,
    status: "pending",
    created_at: Date.now(),
  };
  // Store session data
  await putJson(`sessions/${id}.json`, session);
  // Add to pending queue (sorted by timestamp via filename)
  await putJson(`pending/${session.created_at}_${id}`, id);
}

export async function getSession(id: string): Promise<Session | null> {
  const { blobs } = await list({ prefix: `sessions/${id}.json` });
  if (!blobs.length) return null;
  const res = await fetch(blobs[0].url);
  if (!res.ok) return null;
  return res.json();
}

export async function updateSession(
  id: string,
  updates: Partial<Session>
): Promise<void> {
  const session = await getSession(id);
  if (!session) return;
  await putJson(`sessions/${id}.json`, { ...session, ...updates });
}

// Pop the oldest pending session (FIFO). Returns null if none pending.
export async function popOldestPending(): Promise<string | null> {
  const { blobs } = await list({ prefix: "pending/" });
  if (!blobs.length) return null;

  // Sort ascending by pathname (timestamp_id format → chronological order)
  const oldest = blobs.sort((a, b) =>
    a.pathname.localeCompare(b.pathname)
  )[0];

  const res = await fetch(oldest.url);
  const id = (await res.text()).replace(/^"|"$/g, "").trim();
  await del(oldest.url);
  return id;
}

import { Redis } from "@upstash/redis";
import type { ResearchParams } from "./research";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface Session {
  id: string;
  params: ResearchParams;
  status: "pending" | "paid" | "complete" | "failed";
  result_html?: string;
  created_at: number;
}

const TTL = 60 * 60 * 24 * 7; // 7 days
const PENDING_QUEUE = "xray:pending_sessions";

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
  await redis.set(`xray:session:${id}`, session, { ex: TTL });
  await redis.zadd(PENDING_QUEUE, { score: Date.now(), member: id });
}

export async function getSession(id: string): Promise<Session | null> {
  return redis.get<Session>(`xray:session:${id}`);
}

export async function updateSession(
  id: string,
  updates: Partial<Session>
): Promise<void> {
  const session = await getSession(id);
  if (!session) return;
  await redis.set(
    `xray:session:${id}`,
    { ...session, ...updates },
    { ex: TTL }
  );
}

// Pop the oldest pending session ID (FIFO). Returns null if none pending.
export async function popOldestPending(): Promise<string | null> {
  const results = await redis.zrange(PENDING_QUEUE, 0, 0);
  if (!results.length) return null;
  const id = results[0] as string;
  await redis.zrem(PENDING_QUEUE, id);
  return id;
}

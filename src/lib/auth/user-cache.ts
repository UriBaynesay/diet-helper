import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

type CacheEntry = {
  userId: string | null;
  isAllowed: boolean;
  expiresAt: number;
};

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export async function lookupAuthorizedUser(emailRaw: string): Promise<CacheEntry> {
  const email = emailRaw.toLowerCase();
  const cached = cache.get(email);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const row = await db.query.users.findFirst({ where: eq(users.email, email) });
  const entry: CacheEntry = {
    userId: row?.id ?? null,
    isAllowed: row?.isAllowed ?? false,
    expiresAt: Date.now() + TTL_MS,
  };
  cache.set(email, entry);
  return entry;
}

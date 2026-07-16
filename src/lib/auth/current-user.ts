import { headers } from "next/headers";
import { USER_ID_HEADER, USER_EMAIL_HEADER } from "@/lib/auth/constants";

/**
 * Server Component equivalent of requireUser() — reads the same headers
 * proxy.ts attaches, via Next's headers() API. Only trustworthy because
 * proxy.ts strips any client-supplied copies before setting its own; a
 * Server Component always runs after proxy.ts for a matched route.
 */
export async function getCurrentUser(): Promise<{ userId: string; email: string } | null> {
  const headerList = await headers();
  const userId = headerList.get(USER_ID_HEADER);
  const email = headerList.get(USER_EMAIL_HEADER);
  if (!userId || !email) return null;
  return { userId, email };
}

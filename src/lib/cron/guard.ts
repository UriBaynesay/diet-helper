import { env } from "@/lib/env";

/**
 * Cron routes are excluded from proxy.ts's matcher (they carry no session
 * cookie — a local OS scheduler calls them directly). The shared secret is
 * their only protection.
 */
export function isValidCronRequest(request: Request): boolean {
  const secret = request.headers.get("x-cron-secret");
  return secret === env.CRON_SECRET;
}

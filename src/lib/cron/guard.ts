import { env } from "@/lib/env";
import { CF_JWT_HEADER } from "@/lib/auth/constants";

const CF_FORWARDING_HEADERS = ["cf-connecting-ip", "cf-ray", CF_JWT_HEADER.toLowerCase()];

/**
 * Cron routes are excluded from proxy.ts's matcher (they carry no Access JWT
 * — a local OS scheduler calls them directly). This guard is their only
 * protection: the shared secret proves the caller knows it, and rejecting
 * any Cloudflare forwarding header proves the request didn't arrive through
 * the tunnel (which would mean it's reachable by anyone on the internet who
 * guesses the URL, not just the local scheduler).
 */
export function isValidCronRequest(request: Request): boolean {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== env.CRON_SECRET) {
    return false;
  }

  for (const header of CF_FORWARDING_HEADERS) {
    if (request.headers.has(header)) {
      return false;
    }
  }

  return true;
}

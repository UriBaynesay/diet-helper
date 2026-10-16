/**
 * The origin (scheme + host) the browser actually used to reach us.
 *
 * Behind nginx, Node only ever sees plain HTTP from 127.0.0.1, so request.url
 * says "http:" even for an HTTPS visitor. nginx reports the real scheme in
 * X-Forwarded-Proto. Host comes from the Host header because request.url's
 * host can be normalized to localhost (see proxy.ts).
 */
export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwarded === "https" || forwarded === "http" ? `${forwarded}:` : url.protocol;
  return `${protocol}//${host}`;
}

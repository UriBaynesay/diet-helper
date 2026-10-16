import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { SESSION_COOKIE, USER_ID_HEADER, USER_EMAIL_HEADER } from "@/lib/auth/constants";
import { getRequestOrigin } from "@/lib/auth/origin";

function isApiRequest(request: NextRequest): boolean {
  return request.nextUrl.pathname.startsWith("/api/");
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Build redirects from the Host header and X-Forwarded-Proto the client
  // actually used, not request.url/nextUrl — Next can normalize the host to
  // localhost, and behind nginx the scheme always reads as plain http.
  const origin = getRequestOrigin(request);

  if (!session) {
    if (isApiRequest(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // A validly-signed session token is sufficient proof of a real registered
  // account — only /api/register and /api/login ever issue one, so there's
  // no separate allowlist check to make here anymore.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(USER_ID_HEADER);
  requestHeaders.delete(USER_EMAIL_HEADER);
  requestHeaders.set(USER_ID_HEADER, session.userId);
  requestHeaders.set(USER_EMAIL_HEADER, session.email);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!api/cron|api/health|api/login|api/register|login|register|_next/static|_next/image|favicon.ico).*)",
  ],
};

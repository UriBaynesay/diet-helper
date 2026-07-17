import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { lookupAuthorizedUser } from "@/lib/auth/user-cache";
import { SESSION_COOKIE, USER_ID_HEADER, USER_EMAIL_HEADER } from "@/lib/auth/constants";

function isApiRequest(request: NextRequest): boolean {
  return request.nextUrl.pathname.startsWith("/api/");
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const email = token ? await verifySessionToken(token) : null;

  // Build redirects from the Host header the client actually used, not
  // request.url/nextUrl — Next can normalize those to localhost even when
  // the browser reached the server via a LAN IP or Tailscale address.
  const origin = `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`;

  if (!email) {
    if (isApiRequest(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { userId, isAllowed } = await lookupAuthorizedUser(email);
  if (!userId || !isAllowed) {
    if (isApiRequest(request)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/forbidden", origin));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(USER_ID_HEADER);
  requestHeaders.delete(USER_EMAIL_HEADER);
  requestHeaders.set(USER_ID_HEADER, userId);
  requestHeaders.set(USER_EMAIL_HEADER, email.toLowerCase());

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!api/cron|api/health|api/login|login|forbidden|_next/static|_next/image|favicon.ico).*)",
  ],
};

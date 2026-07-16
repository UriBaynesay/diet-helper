import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessJwt } from "@/lib/auth/jwks";
import { lookupAuthorizedUser } from "@/lib/auth/user-cache";
import {
  CF_JWT_HEADER,
  CF_ACCESS_COOKIE,
  DEV_USER_EMAIL_HEADER,
  DEV_USER_EMAIL_COOKIE,
  USER_ID_HEADER,
  USER_EMAIL_HEADER,
} from "@/lib/auth/constants";

async function resolveVerifiedEmail(request: NextRequest): Promise<string | null> {
  const token =
    request.headers.get(CF_JWT_HEADER) ?? request.cookies.get(CF_ACCESS_COOKIE)?.value;

  if (token) {
    try {
      const payload = await verifyAccessJwt(token);
      return typeof payload.email === "string" ? payload.email : null;
    } catch {
      return null;
    }
  }

  // Dev-only bypass (no live Cloudflare tunnel/Access app for local testing).
  // Gate on NODE_ENV first, not header/cookie presence, so a misconfigured
  // prod env can't accept it. Header covers curl; cookie covers the browser
  // (set by /login, since browsers don't let pages set arbitrary request
  // headers on normal navigations).
  if (process.env.NODE_ENV === "development") {
    const devEmail =
      request.headers.get(DEV_USER_EMAIL_HEADER) ??
      request.cookies.get(DEV_USER_EMAIL_COOKIE)?.value;
    if (devEmail) return devEmail;
  }

  return null;
}

function isApiRequest(request: NextRequest): boolean {
  return request.nextUrl.pathname.startsWith("/api/");
}

export async function proxy(request: NextRequest) {
  const email = await resolveVerifiedEmail(request);

  // Build redirects from the Host header the client actually used, not
  // request.url/nextUrl — Next can normalize those to localhost even when
  // the browser reached the server via a LAN IP (e.g. testing on a phone).
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
    "/((?!api/cron|api/health|api/dev-login|login|forbidden|_next/static|_next/image|favicon.ico).*)",
  ],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessJwt } from "@/lib/auth/jwks";
import { lookupAuthorizedUser } from "@/lib/auth/user-cache";
import {
  CF_JWT_HEADER,
  CF_ACCESS_COOKIE,
  DEV_USER_EMAIL_HEADER,
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
  // Gate on NODE_ENV first, not header presence, so a misconfigured prod env can't accept it.
  if (process.env.NODE_ENV === "development") {
    const devEmail = request.headers.get(DEV_USER_EMAIL_HEADER);
    if (devEmail) return devEmail;
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const email = await resolveVerifiedEmail(request);

  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { userId, isAllowed } = await lookupAuthorizedUser(email);
  if (!userId || !isAllowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(USER_ID_HEADER);
  requestHeaders.delete(USER_EMAIL_HEADER);
  requestHeaders.set(USER_ID_HEADER, userId);
  requestHeaders.set(USER_EMAIL_HEADER, email.toLowerCase());

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api/cron|api/health|_next/static|_next/image|favicon.ico).*)"],
};

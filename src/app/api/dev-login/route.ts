import { NextResponse } from "next/server";
import { DEV_USER_EMAIL_COOKIE } from "@/lib/auth/constants";

// Dev-only: sets the cookie proxy.ts reads as its dev bypass. Hard-gated on
// NODE_ENV, same as the header path — never reachable in production even if
// someone finds the route.
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const formData = await request.formData();
  const email = formData.get("email");
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: { code: "validation_error" } }, { status: 400 });
  }

  // Build the redirect from the Host header the client actually used, not
  // request.url — Next can normalize that to localhost even when the browser
  // reached the server via a LAN IP (e.g. testing on a phone).
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const protocol = new URL(request.url).protocol;
  const redirectTo = new URL((formData.get("from") as string) || "/", `${protocol}//${host}`);
  const response = NextResponse.redirect(redirectTo);
  response.cookies.set(DEV_USER_EMAIL_COOKIE, email.trim().toLowerCase(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}

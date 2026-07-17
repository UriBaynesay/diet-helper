import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSessionToken } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = formData.get("password");

  if (typeof password !== "string" || password !== env.APP_PASSWORD) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "invalid_password");
    const from = formData.get("from");
    if (typeof from === "string" && from) loginUrl.searchParams.set("from", from);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const host = request.headers.get("host") ?? new URL(request.url).host;
  const protocol = new URL(request.url).protocol;
  const redirectTo = new URL((formData.get("from") as string) || "/", `${protocol}//${host}`);

  const token = await createSessionToken(env.OWNER_EMAIL.toLowerCase());
  const response = NextResponse.redirect(redirectTo, { status: 303 });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

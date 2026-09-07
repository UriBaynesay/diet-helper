import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import {
  createPasswordVerifiedToken,
  createSessionToken,
  verifyPasswordVerifiedToken,
} from "@/lib/auth/session";
import { lookupAuthorizedUser } from "@/lib/auth/user-cache";
import { PASSWORD_VERIFIED_COOKIE, SESSION_COOKIE } from "@/lib/auth/constants";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_VERIFIED_MAX_AGE_SECONDS = 60 * 5;

function loginRedirect(
  request: Request,
  params: { error?: string; from?: string },
): NextResponse {
  const loginUrl = new URL("/login", request.url);
  if (params.error) loginUrl.searchParams.set("error", params.error);
  if (params.from) loginUrl.searchParams.set("from", params.from);
  return NextResponse.redirect(loginUrl, { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get("from");
  const fromValue = typeof from === "string" && from ? from : undefined;

  const cookieStore = await cookies();
  const pwVerifiedToken = cookieStore.get(PASSWORD_VERIFIED_COOKIE)?.value;
  const passwordAlreadyVerified = pwVerifiedToken
    ? await verifyPasswordVerifiedToken(pwVerifiedToken)
    : false;

  // Step 2: password already verified this session — expect an email.
  if (passwordAlreadyVerified) {
    const email = formData.get("email");
    if (typeof email !== "string" || !email) {
      return loginRedirect(request, { from: fromValue });
    }

    const { userId, isAllowed } = await lookupAuthorizedUser(email);
    if (!userId || !isAllowed) {
      // Stay on the email step — do not clear the password-verified
      // cookie, so the user can retry the email without re-entering the
      // shared password.
      return loginRedirect(request, { error: "invalid_email", from: fromValue });
    }

    const host = request.headers.get("host") ?? new URL(request.url).host;
    const protocol = new URL(request.url).protocol;
    const redirectTo = new URL(fromValue || "/", `${protocol}//${host}`);

    const token = await createSessionToken(email.toLowerCase());
    const response = NextResponse.redirect(redirectTo, { status: 303 });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    response.cookies.delete(PASSWORD_VERIFIED_COOKIE);
    return response;
  }

  // Step 1: no valid password-verified cookie — expect the shared password.
  const password = formData.get("password");
  if (typeof password !== "string" || password !== env.APP_PASSWORD) {
    return loginRedirect(request, { error: "invalid_password", from: fromValue });
  }

  const pwToken = await createPasswordVerifiedToken();
  const response = loginRedirect(request, { from: fromValue });
  response.cookies.set(PASSWORD_VERIFIED_COOKIE, pwToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: PASSWORD_VERIFIED_MAX_AGE_SECONDS,
  });
  return response;
}

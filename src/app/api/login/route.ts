import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createSessionToken } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { loginSchema } from "@/lib/auth/schema";
import { getRequestOrigin } from "@/lib/auth/origin";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function loginRedirect(request: Request, params: { error?: string; from?: string }): NextResponse {
  const loginUrl = new URL("/login", getRequestOrigin(request));
  if (params.error) loginUrl.searchParams.set("error", params.error);
  if (params.from) loginUrl.searchParams.set("from", params.from);
  return NextResponse.redirect(loginUrl, { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get("from");
  const fromValue = typeof from === "string" && from ? from : undefined;

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return loginRedirect(request, { error: "invalid_credentials", from: fromValue });
  }
  const { email, password } = parsed.data;

  const row = await db.query.profiles.findFirst({
    where: eq(profiles.email, email.toLowerCase()),
  });

  // Deliberately the same generic error whether the email doesn't exist,
  // the account has no password (a hypothetical future OAuth-only
  // account), or the password is simply wrong — never let a login attempt
  // reveal which of those is the case (email enumeration).
  if (!row || !row.passwordHash) {
    return loginRedirect(request, { error: "invalid_credentials", from: fromValue });
  }

  const passwordMatches = await bcrypt.compare(password, row.passwordHash);
  if (!passwordMatches) {
    return loginRedirect(request, { error: "invalid_credentials", from: fromValue });
  }

  const redirectTo = new URL(fromValue || "/", getRequestOrigin(request));

  const token = await createSessionToken(row.id, email.toLowerCase());
  const response = NextResponse.redirect(redirectTo, { status: 303 });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createSessionToken } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { registerSchema } from "@/lib/auth/schema";
import { getRequestOrigin } from "@/lib/auth/origin";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const BCRYPT_COST_FACTOR = 10;

function registerRedirect(request: Request, params: { error?: string; from?: string }): NextResponse {
  const registerUrl = new URL("/register", getRequestOrigin(request));
  if (params.error) registerUrl.searchParams.set("error", params.error);
  if (params.from) registerUrl.searchParams.set("from", params.from);
  return NextResponse.redirect(registerUrl, { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get("from");
  const fromValue = typeof from === "string" && from ? from : undefined;

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((issue) => issue.path.includes("confirmPassword"));
    return registerRedirect(request, {
      error: mismatch ? "password_mismatch" : "validation_error",
      from: fromValue,
    });
  }
  const email = parsed.data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST_FACTOR);

  const [row] = await db
    .insert(profiles)
    .values({ email, passwordHash })
    .onConflictDoNothing({ target: profiles.email })
    .returning();

  if (!row) {
    return registerRedirect(request, { error: "email_taken", from: fromValue });
  }

  const redirectTo = new URL(fromValue || "/", getRequestOrigin(request));

  const token = await createSessionToken(row.id, email);
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

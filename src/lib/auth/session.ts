import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const ISSUER = "diet-helper";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days — personal app, long-lived on purpose

function getSecretKey() {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

/** Signs a session token binding this device to the app's one owner account. */
export async function createSessionToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

/** Returns the session's email if the token is validly signed and unexpired, else null. */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { issuer: ISSUER });
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

const PASSWORD_VERIFIED_TTL_SECONDS = 60 * 5; // 5 minutes — long enough to
// type an email, short enough that an unlocked device left open doesn't
// leave a wide password-bypassed window.
const PASSWORD_VERIFIED_PURPOSE = "pw_verified";

/**
 * Signs a short-lived token proving the shared APP_PASSWORD was entered
 * correctly, without yet identifying which user is logging in. Distinct
 * purpose claim (not `email`) keeps it from being usable as a session token
 * even if read by code expecting one.
 */
export async function createPasswordVerifiedToken(): Promise<string> {
  return new SignJWT({ purpose: PASSWORD_VERIFIED_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${PASSWORD_VERIFIED_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

/** Returns true if the token is a validly signed, unexpired password-verified token. */
export async function verifyPasswordVerifiedToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { issuer: ISSUER });
    return payload.purpose === PASSWORD_VERIFIED_PURPOSE;
  } catch {
    return false;
  }
}

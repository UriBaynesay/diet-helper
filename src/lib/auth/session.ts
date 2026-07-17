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

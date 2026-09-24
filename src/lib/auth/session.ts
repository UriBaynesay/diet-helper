import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const ISSUER = "diet-helper";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days — personal app, long-lived on purpose

function getSecretKey() {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

/** Signs a session token identifying which registered account this device is logged in as. */
export async function createSessionToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

/** Returns the session's { userId, email } if the token is validly signed and unexpired, else null. */
export async function verifySessionToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { issuer: ISSUER });
    if (typeof payload.userId === "string" && typeof payload.email === "string") {
      return { userId: payload.userId, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}

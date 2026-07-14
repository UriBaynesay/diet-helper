import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "@/lib/env";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(
        `https://${env.CF_ACCESS_TEAM_DOMAIN}.cloudflareaccess.com/cdn-cgi/access/certs`
      )
    );
  }
  return jwks;
}

export async function verifyAccessJwt(token: string) {
  const { payload } = await jwtVerify(token, getJwks(), {
    audience: env.CF_ACCESS_AUD,
    issuer: `https://${env.CF_ACCESS_TEAM_DOMAIN}.cloudflareaccess.com`,
  });
  return payload;
}

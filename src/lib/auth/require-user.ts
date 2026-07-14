import { USER_ID_HEADER, USER_EMAIL_HEADER } from "@/lib/auth/constants";

export class UnauthenticatedError extends Error {}

/**
 * The sanctioned way for route handlers to read the verified identity that
 * proxy.ts attaches to the request. proxy.ts strips any client-supplied
 * copies of these headers before setting its own, so a value present here
 * can only have been set by proxy.ts itself — never trust any other source
 * (body, query string, path) for user identity.
 */
export function requireUser(request: Request): { userId: string; email: string } {
  const userId = request.headers.get(USER_ID_HEADER);
  const email = request.headers.get(USER_EMAIL_HEADER);

  if (!userId || !email) {
    throw new UnauthenticatedError("Missing verified user headers");
  }

  return { userId, email };
}

import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { getSuggestions } from "@/lib/suggestions/get-suggestions";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  let user;
  try {
    user = requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!DATE_RE.test(date)) {
    return apiError("validation_error", "date must be YYYY-MM-DD", 400);
  }

  const { remaining, suggestions } = await getSuggestions(user.userId, date);
  if (!remaining) {
    return apiError("no_goal", "No active goal — set one before requesting suggestions", 400);
  }

  return apiData({ remaining, suggestions });
}

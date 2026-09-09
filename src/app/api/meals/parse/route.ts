import { z } from "zod";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { parseMealText } from "@/lib/meals/parse-meal";

const bodySchema = z.object({
  text: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const body = await request.json();
  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) {
    return apiError("validation_error", parsedBody.error.message, 400);
  }

  const { parsed } = await parseMealText(parsedBody.data.text);
  if (!parsed) {
    return apiError("parse_failed", "Could not parse the meal text", 422);
  }

  // Never resolved to real products here — the client must match every
  // ingredient to a real product before this can be saved as a meal.
  return apiData({ parsed });
}

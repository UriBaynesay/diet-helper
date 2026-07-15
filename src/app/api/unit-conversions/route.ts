import { db } from "@/db";
import { unitConversions } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { unitConversionInputSchema } from "@/lib/ingestion/unit-conversion-schema";

export async function GET(request: Request) {
  try {
    requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const rows = await db.select().from(unitConversions);
  return apiData(rows);
}

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
  const parsed = unitConversionInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", parsed.error.message, 400);
  }
  const input = parsed.data;

  const [row] = await db
    .insert(unitConversions)
    .values({
      unit: input.unit,
      ingredientPattern: input.ingredientPattern,
      grams: input.grams.toString(),
    })
    .returning();

  return apiData({ conversion: row }, { status: 201 });
}

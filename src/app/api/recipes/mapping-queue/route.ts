import { inArray, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { recipeIngredients } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";

/**
 * Unmatched/low-confidence ingredient lines, grouped by parsed_name — fixing
 * one name's mapping unblocks every recipe that used it (spec §11.3).
 */
export async function GET(request: Request) {
  try {
    requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const rows = await db
    .select()
    .from(recipeIngredients)
    .where(
      or(
        inArray(recipeIngredients.matchConfidence, ["unmatched", "low", "medium"]),
        isNull(recipeIngredients.productId)
      )
    );

  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    if (row.productId && row.matchConfidence === "high") continue;
    const key = row.parsedName ?? row.rawText ?? "";
    if (!key) continue;
    const existing = grouped.get(key) ?? [];
    existing.push(row);
    grouped.set(key, existing);
  }

  const queue = [...grouped.entries()].map(([ingredientName, entries]) => ({
    ingredientName,
    count: entries.length,
    entries,
  }));

  return apiData(queue);
}

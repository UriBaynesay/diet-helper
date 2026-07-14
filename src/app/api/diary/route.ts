import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, products } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { diaryEntryInputSchema } from "@/lib/diary/schema";
import { macrosForQuantity } from "@/lib/diary/macros";
import { findActiveGoal } from "@/lib/goals/active-goal";

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
  const date = searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return apiError("validation_error", "date query param (YYYY-MM-DD) is required", 400);
  }

  const entries = await db
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.userId, user.userId), eq(diaryEntries.entryDate, new Date(date))));

  const totals = entries.reduce(
    (acc, entry) => ({
      kcal: acc.kcal + Number(entry.kcal),
      proteinG: acc.proteinG + Number(entry.proteinG),
      carbsG: acc.carbsG + Number(entry.carbsG),
      fatG: acc.fatG + Number(entry.fatG),
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  // Active goal is the row with the greatest effective_from <= the viewed
  // date — a past date shows the target that was active then, not today's.
  const activeGoal = await findActiveGoal(user.userId, new Date(date));
  const target = activeGoal
    ? {
        kcal: Number(activeGoal.targetKcal),
        proteinG: Number(activeGoal.targetProteinG),
        carbsG: Number(activeGoal.targetCarbsG),
        fatG: Number(activeGoal.targetFatG),
      }
    : null;

  return apiData({ entries, totals, target });
}

export async function POST(request: Request) {
  let user;
  try {
    user = requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const body = await request.json();
  const parsed = diaryEntryInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", parsed.error.message, 400);
  }
  const input = parsed.data;

  const product = await db.query.products.findFirst({
    where: eq(products.id, input.productId),
  });
  if (!product || product.archivedAt) {
    return apiError("not_found", "Product not found", 404);
  }

  const macros = macrosForQuantity(product, input.quantityG);

  const [row] = await db
    .insert(diaryEntries)
    .values({
      userId: user.userId,
      entryDate: new Date(input.entryDate),
      mealType: input.mealType,
      productId: input.productId,
      quantityG: input.quantityG.toString(),
      kcal: macros.kcal.toString(),
      proteinG: macros.proteinG.toString(),
      carbsG: macros.carbsG.toString(),
      fatG: macros.fatG.toString(),
    })
    .returning();

  return apiData({ entry: row }, { status: 201 });
}

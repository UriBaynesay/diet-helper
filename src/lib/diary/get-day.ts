import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, products, meals } from "@/db/schema";
import { findActiveGoal } from "@/lib/goals/active-goal";

export type Macros = { kcal: number; proteinG: number; carbsG: number; fatG: number };

export type DiaryDayEntry = {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  productId: string | null;
  mealId: string | null;
  quantityG: string | null;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  name: string;
};

/** Shared by GET /api/diary and the Today Server Component — one query path, no HTTP round-trip from the page. */
export async function getDiaryDay(userId: string, date: string) {
  const rows = await db
    .select({
      id: diaryEntries.id,
      mealType: diaryEntries.mealType,
      productId: diaryEntries.productId,
      mealId: diaryEntries.mealId,
      quantityG: diaryEntries.quantityG,
      kcal: diaryEntries.kcal,
      proteinG: diaryEntries.proteinG,
      carbsG: diaryEntries.carbsG,
      fatG: diaryEntries.fatG,
      productName: products.name,
      mealName: meals.name,
    })
    .from(diaryEntries)
    .leftJoin(products, eq(diaryEntries.productId, products.id))
    .leftJoin(meals, eq(diaryEntries.mealId, meals.id))
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.entryDate, new Date(date))));

  const entries: DiaryDayEntry[] = rows.map((row) => ({
    id: row.id,
    mealType: row.mealType,
    productId: row.productId,
    mealId: row.mealId,
    quantityG: row.quantityG,
    kcal: Number(row.kcal),
    proteinG: Number(row.proteinG),
    carbsG: Number(row.carbsG),
    fatG: Number(row.fatG),
    name: row.productName ?? row.mealName ?? "",
  }));

  const totals = entries.reduce<Macros>(
    (acc, entry) => ({
      kcal: acc.kcal + entry.kcal,
      proteinG: acc.proteinG + entry.proteinG,
      carbsG: acc.carbsG + entry.carbsG,
      fatG: acc.fatG + entry.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  const activeGoal = await findActiveGoal(userId, new Date(date));
  const target: Macros | null = activeGoal
    ? {
        kcal: Number(activeGoal.targetKcal),
        proteinG: Number(activeGoal.targetProteinG),
        carbsG: Number(activeGoal.targetCarbsG),
        fatG: Number(activeGoal.targetFatG),
      }
    : null;

  return { entries, totals, target };
}

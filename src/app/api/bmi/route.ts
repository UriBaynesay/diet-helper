import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, weightLogs } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { strings } from "@/lib/strings";
import {
  calculateBmi,
  bmiCategory,
  calculateBmr,
  calculateTdee,
  calculateCalorieTarget,
  calculateMacroSplit,
  ageFromBirthDate,
} from "@/lib/profile/calculations";

const GOAL_TYPES = ["lose", "maintain", "gain"] as const;

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
  const goalTypeParam = searchParams.get("goalType") ?? "maintain";
  if (!GOAL_TYPES.includes(goalTypeParam as (typeof GOAL_TYPES)[number])) {
    return apiError("validation_error", "goalType must be lose|maintain|gain", 400);
  }
  const goalType = goalTypeParam as (typeof GOAL_TYPES)[number];

  const profile = await db.query.users.findFirst({ where: eq(users.id, user.userId) });
  if (!profile?.sex || !profile.birthDate || !profile.heightCm || !profile.activityLevel) {
    return apiError(
      "incomplete_profile",
      "sex, birthDate, heightCm and activityLevel must be set first",
      400
    );
  }

  const latestWeight = await db.query.weightLogs.findFirst({
    where: eq(weightLogs.userId, user.userId),
    orderBy: desc(weightLogs.loggedOn),
  });
  if (!latestWeight) {
    return apiError("no_weight_log", "Log a weight entry first", 400);
  }

  const weightKg = Number(latestWeight.weightKg);
  const age = ageFromBirthDate(profile.birthDate);
  const bmi = calculateBmi(weightKg, profile.heightCm);
  const bmr = calculateBmr({ sex: profile.sex, weightKg, heightCm: profile.heightCm, age });
  const tdee = calculateTdee(bmr, profile.activityLevel);
  const { kcal: targetKcal, flooredAtMinimum } = calculateCalorieTarget(tdee, goalType);
  const macros = calculateMacroSplit(targetKcal, weightKg);

  return apiData({
    bmi,
    bmiCategory: bmiCategory(bmi),
    bmr,
    tdee,
    goalType,
    targetKcal,
    flooredAtMinimum,
    targetProteinG: macros.proteinG,
    targetFatG: macros.fatG,
    targetCarbsG: macros.carbsG,
    disclaimer: strings.bmi.disclaimer,
  });
}

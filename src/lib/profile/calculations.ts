export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType = "lose" | "maintain" | "gain";

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENTS: Record<GoalType, number> = {
  lose: -0.2,
  maintain: 0,
  gain: 0.1,
};

export const CALORIE_FLOOR = 1200;

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): "underweight" | "normal" | "overweight" | "obese" {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

export function calculateBmr(params: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const base = 10 * params.weightKg + 6.25 * params.heightCm - 5 * params.age;
  return params.sex === "male" ? base + 5 : base - 161;
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activityLevel];
}

export function calculateCalorieTarget(
  tdee: number,
  goalType: GoalType
): { kcal: number; flooredAtMinimum: boolean } {
  const raw = tdee * (1 + GOAL_ADJUSTMENTS[goalType]);
  const flooredAtMinimum = raw < CALORIE_FLOOR;
  return { kcal: flooredAtMinimum ? CALORIE_FLOOR : raw, flooredAtMinimum };
}

export function calculateMacroSplit(
  kcalTarget: number,
  weightKg: number
): { proteinG: number; fatG: number; carbsG: number } {
  const proteinG = 1.8 * weightKg;
  const proteinKcal = proteinG * 4;
  const fatKcal = kcalTarget * 0.25;
  const fatG = fatKcal / 9;
  const carbsKcal = Math.max(0, kcalTarget - proteinKcal - fatKcal);
  const carbsG = carbsKcal / 4;
  return { proteinG, fatG, carbsG };
}

export function ageFromBirthDate(birthDate: Date, onDate: Date = new Date()): number {
  let age = onDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = onDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && onDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

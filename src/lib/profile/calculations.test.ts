import { describe, expect, it } from "vitest";
import {
  calculateBmi,
  bmiCategory,
  calculateBmr,
  calculateTdee,
  calculateCalorieTarget,
  calculateMacroSplit,
  ageFromBirthDate,
  CALORIE_FLOOR,
} from "./calculations";

describe("calculateBmi", () => {
  it("computes weight / height^2", () => {
    // 70kg / 1.75m^2 = 22.857...
    expect(calculateBmi(70, 175)).toBeCloseTo(22.857, 3);
  });
});

describe("bmiCategory", () => {
  it("classifies per the WHO bands from the spec", () => {
    expect(bmiCategory(18.4)).toBe("underweight");
    expect(bmiCategory(18.5)).toBe("normal");
    expect(bmiCategory(24.9)).toBe("normal");
    expect(bmiCategory(25)).toBe("overweight");
    expect(bmiCategory(29.9)).toBe("overweight");
    expect(bmiCategory(30)).toBe("obese");
  });
});

describe("calculateBmr", () => {
  it("applies the Mifflin-St Jeor formula for males (+5)", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(calculateBmr({ sex: "male", weightKg: 80, heightCm: 180, age: 30 })).toBe(1780);
  });

  it("applies the Mifflin-St Jeor formula for females (-161)", () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    expect(calculateBmr({ sex: "female", weightKg: 60, heightCm: 165, age: 25 })).toBe(1345.25);
  });
});

describe("calculateTdee", () => {
  it("multiplies BMR by the spec's activity factors", () => {
    expect(calculateTdee(1500, "sedentary")).toBe(1800);
    expect(calculateTdee(1500, "light")).toBeCloseTo(2062.5, 5);
    expect(calculateTdee(1500, "moderate")).toBeCloseTo(2325, 5);
    expect(calculateTdee(1500, "active")).toBeCloseTo(2587.5, 5);
    expect(calculateTdee(1500, "very_active")).toBe(2850);
  });
});

describe("calculateCalorieTarget", () => {
  it("applies -20% for lose, 0 for maintain, +10% for gain", () => {
    expect(calculateCalorieTarget(2000, "lose").kcal).toBe(1600);
    expect(calculateCalorieTarget(2000, "maintain").kcal).toBe(2000);
    expect(calculateCalorieTarget(2000, "gain").kcal).toBe(2200);
  });

  it("floors at 1200 kcal and flags when the floor binds", () => {
    const result = calculateCalorieTarget(1300, "lose"); // 1040 -> floored
    expect(result.kcal).toBe(CALORIE_FLOOR);
    expect(result.flooredAtMinimum).toBe(true);
  });

  it("does not flag the floor when above it", () => {
    const result = calculateCalorieTarget(2000, "maintain");
    expect(result.flooredAtMinimum).toBe(false);
  });
});

describe("calculateMacroSplit", () => {
  it("derives protein at 1.8g/kg, fat at 25% kcal, carbs as remainder", () => {
    // weight 70kg -> protein 126g (504 kcal); kcal target 2000 -> fat 500kcal/9 = 55.56g;
    // carbs = (2000 - 504 - 500) / 4 = 249g
    const result = calculateMacroSplit(2000, 70);
    expect(result.proteinG).toBe(126);
    expect(result.fatG).toBeCloseTo(55.556, 3);
    expect(result.carbsG).toBeCloseTo(249, 3);
  });

  it("never produces negative carbs when protein+fat exceed the kcal target", () => {
    // Extreme case: very high weight relative to a low kcal target.
    const result = calculateMacroSplit(1200, 200);
    expect(result.carbsG).toBeGreaterThanOrEqual(0);
  });
});

describe("ageFromBirthDate", () => {
  it("computes whole years elapsed", () => {
    expect(ageFromBirthDate(new Date("1990-06-15"), new Date("2026-06-15"))).toBe(36);
  });

  it("has not had this year's birthday yet", () => {
    expect(ageFromBirthDate(new Date("1990-06-15"), new Date("2026-06-14"))).toBe(35);
  });

  it("already had this year's birthday", () => {
    expect(ageFromBirthDate(new Date("1990-06-15"), new Date("2026-07-14"))).toBe(36);
  });
});

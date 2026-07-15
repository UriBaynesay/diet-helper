import { describe, expect, it } from "vitest";
import { buildSubject, buildVerdict } from "./summary";

describe("buildSubject", () => {
  it("formats consumed/target with thousands separators (spec's own example)", () => {
    expect(buildSubject(1840, 2200)).toBe("תזונה — 1,840 / 2,200 קלוריות היום");
  });
});

describe("buildVerdict", () => {
  it("reports remaining kcal and protein when under target (spec's own example)", () => {
    const consumed = { kcal: 1860, proteinG: 105, carbsG: 0, fatG: 0 };
    const target = { kcal: 2200, proteinG: 130, carbsG: 0, fatG: 0 };
    // remaining: 340 kcal, 25g protein
    expect(buildVerdict(consumed, target)).toContain("340");
    expect(buildVerdict(consumed, target)).toContain("25");
  });

  it("reports an overage when kcal exceeds target", () => {
    const consumed = { kcal: 2500, proteinG: 100, carbsG: 0, fatG: 0 };
    const target = { kcal: 2200, proteinG: 130, carbsG: 0, fatG: 0 };
    const verdict = buildVerdict(consumed, target);
    expect(verdict).toContain("חריגה");
    expect(verdict).toContain("300");
  });
});

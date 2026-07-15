export type Macros = { kcal: number; proteinG: number; carbsG: number; fatG: number };

function formatNumber(n: number): string {
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(n);
}

export function buildSubject(consumedKcal: number, targetKcal: number): string {
  return `תזונה — ${formatNumber(consumedKcal)} / ${formatNumber(targetKcal)} קלוריות היום`;
}

/**
 * One-line verdict: how far over/under target, in kcal and protein — the
 * two macros people actually track day to day (spec's own example).
 */
export function buildVerdict(consumed: Macros, target: Macros): string {
  const kcalDiff = target.kcal - consumed.kcal;
  const proteinDiff = target.proteinG - consumed.proteinG;

  if (kcalDiff >= 0) {
    return `נשארו ${formatNumber(kcalDiff)} קלוריות ו-${formatNumber(Math.abs(proteinDiff))} גרם חלבון ${proteinDiff >= 0 ? "ליעד" : "מעבר ליעד"}.`;
  }
  return `חריגה של ${formatNumber(Math.abs(kcalDiff))} קלוריות מהיעד.`;
}

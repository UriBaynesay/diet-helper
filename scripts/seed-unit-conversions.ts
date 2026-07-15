// Run manually: npm run db:seed-unit-conversions (never invoked by app boot).
// Generic (non-ingredient-specific) volume/weight conversions for common US
// cooking measures — Spoonacular recipes are English-language, so these
// cover that source rather than the Hebrew aliases spec §5 mentions for a
// future Hebrew-ingestion source.
import { db } from "@/db";
import { unitConversions } from "@/db/schema";

const GENERIC: Array<{ unit: string; grams: number }> = [
  { unit: "cup", grams: 240 },
  { unit: "tbsp", grams: 15 },
  { unit: "tablespoon", grams: 15 },
  { unit: "tsp", grams: 5 },
  { unit: "teaspoon", grams: 5 },
  { unit: "oz", grams: 28.35 },
  { unit: "ounce", grams: 28.35 },
  { unit: "lb", grams: 453.6 },
  { unit: "pound", grams: 453.6 },
  { unit: "g", grams: 1 },
  { unit: "gram", grams: 1 },
  { unit: "kg", grams: 1000 },
  { unit: "ml", grams: 1 },
  { unit: "l", grams: 1000 },
  { unit: "pinch", grams: 0.5 },
  { unit: "dash", grams: 0.5 },
  { unit: "stick", grams: 113 }, // butter stick
  { unit: "clove", grams: 3 }, // garlic clove
  { unit: "fl oz", grams: 30 },
  { unit: "fluid ounce", grams: 30 },
  { unit: "quart", grams: 960 },
  { unit: "pint", grams: 480 },
  { unit: "slice", grams: 25 },
  { unit: "piece", grams: 30 },
  { unit: "can", grams: 400 },
  { unit: "package", grams: 250 },
  { unit: "packet", grams: 7 },
  { unit: "bunch", grams: 100 },
  { unit: "sprig", grams: 1 },
  { unit: "head", grams: 500 },
  { unit: "handful", grams: 30 },
];

// Ingredient-specific overrides (unit + a pattern matched against the
// parsed ingredient name) take precedence over the generic table above.
const SPECIFIC: Array<{ unit: string; ingredientPattern: string; grams: number }> = [
  { unit: "cup", ingredientPattern: "flour", grams: 120 },
  { unit: "cup", ingredientPattern: "sugar", grams: 200 },
  { unit: "cup", ingredientPattern: "rice", grams: 185 },
  { unit: "cup", ingredientPattern: "butter", grams: 227 },
  { unit: "cup", ingredientPattern: "milk", grams: 240 },
  { unit: "cup", ingredientPattern: "water", grams: 240 },
  { unit: "cup", ingredientPattern: "oats", grams: 90 },
  { unit: "tbsp", ingredientPattern: "butter", grams: 14 },
  { unit: "tbsp", ingredientPattern: "oil", grams: 13.5 },
];

async function main() {
  const rows = [
    ...GENERIC.map((g) => ({ unit: g.unit, ingredientPattern: null, grams: g.grams.toString() })),
    ...SPECIFIC.map((s) => ({
      unit: s.unit,
      ingredientPattern: s.ingredientPattern,
      grams: s.grams.toString(),
    })),
  ];

  await db.insert(unitConversions).values(rows);
  console.log(`Seeded ${rows.length} unit conversions.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});

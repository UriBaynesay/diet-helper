-- Custom SQL migration file, put your code below! --

-- Recipe nutrition is derived, never stored: sum of ingredient macros / servings.
CREATE VIEW "recipe_nutrition" AS
SELECT
  r.id AS recipe_id,
  r.servings,
  COALESCE(SUM(p.kcal_per_100g * ri.quantity_g / 100), 0) / r.servings AS kcal_per_serving,
  COALESCE(SUM(p.protein_per_100g * ri.quantity_g / 100), 0) / r.servings AS protein_g_per_serving,
  COALESCE(SUM(p.carbs_per_100g * ri.quantity_g / 100), 0) / r.servings AS carbs_g_per_serving,
  COALESCE(SUM(p.fat_per_100g * ri.quantity_g / 100), 0) / r.servings AS fat_g_per_serving
FROM "recipes" r
LEFT JOIN "recipe_ingredients" ri ON ri.recipe_id = r.id
LEFT JOIN "products" p ON p.id = ri.product_id
GROUP BY r.id, r.servings;

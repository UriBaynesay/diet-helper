import { eq } from "drizzle-orm";
import { db } from "@/db";
import { extractionJobs } from "@/db/schema";
import { extractNutritionFromImage } from "./extract";
import { perServingToPer100g } from "./normalize";
import { kcalSanityWarning } from "@/lib/products/schema";

export async function processExtractionJob(params: {
  jobId: string;
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}) {
  await db
    .update(extractionJobs)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(extractionJobs.id, params.jobId));

  try {
    const { parsed, raw } = await extractNutritionFromImage({
      imageBase64: params.imageBase64,
      mediaType: params.mediaType,
    });

    if (!parsed) {
      await db
        .update(extractionJobs)
        .set({
          status: "failed",
          error: "Model response failed schema validation",
          rawResponse: raw as object,
          updatedAt: new Date(),
        })
        .where(eq(extractionJobs.id, params.jobId));
      return;
    }

    let normalized = {
      kcalPer100g: parsed.kcal,
      proteinPer100g: parsed.protein_g,
      carbsPer100g: parsed.carbs_g,
      fatPer100g: parsed.fat_g,
      fiberPer100g: parsed.fiber_g,
      sugarPer100g: parsed.sugar_g,
      sodiumMgPer100g: parsed.sodium_mg,
    };

    if (
      parsed.basis === "per_serving" &&
      parsed.serving_size_g &&
      parsed.kcal !== null &&
      parsed.protein_g !== null &&
      parsed.carbs_g !== null &&
      parsed.fat_g !== null
    ) {
      const per100g = perServingToPer100g(
        {
          kcal: parsed.kcal,
          proteinG: parsed.protein_g,
          carbsG: parsed.carbs_g,
          fatG: parsed.fat_g,
          fiberG: parsed.fiber_g,
          sugarG: parsed.sugar_g,
          sodiumMg: parsed.sodium_mg,
        },
        parsed.serving_size_g
      );
      normalized = {
        kcalPer100g: per100g.kcal,
        proteinPer100g: per100g.proteinG,
        carbsPer100g: per100g.carbsG,
        fatPer100g: per100g.fatG,
        fiberPer100g: per100g.fiberG,
        sugarPer100g: per100g.sugarG,
        sodiumMgPer100g: per100g.sodiumMg,
      };
    }
    // per_serving with no serving_size_g: spec says this is not a failure —
    // leave the raw (per-serving) values as-is and let the review screen
    // require the user to supply the serving size before saving.

    let confidence = parsed.confidence;
    if (
      normalized.kcalPer100g !== null &&
      normalized.proteinPer100g !== null &&
      normalized.carbsPer100g !== null &&
      normalized.fatPer100g !== null
    ) {
      const warning = kcalSanityWarning({
        kcalPer100g: normalized.kcalPer100g,
        proteinPer100g: normalized.proteinPer100g,
        carbsPer100g: normalized.carbsPer100g,
        fatPer100g: normalized.fatPer100g,
      });
      if (warning) confidence = "low";
    }

    await db
      .update(extractionJobs)
      .set({
        status: "succeeded",
        rawResponse: raw as object,
        parsed: { ...parsed, ...normalized, confidence },
        confidence,
        updatedAt: new Date(),
      })
      .where(eq(extractionJobs.id, params.jobId));
  } catch (error) {
    await db
      .update(extractionJobs)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        updatedAt: new Date(),
      })
      .where(eq(extractionJobs.id, params.jobId));
  }
}

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { env } from "@/lib/env";

const HIGH_THRESHOLD = 0.6;
const MEDIUM_THRESHOLD = 0.35;
const SHORTLIST_SIZE = 20;

export type MatchResult =
  | { confidence: "high" | "medium"; productId: string }
  | { confidence: "unmatched"; productId: null };

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

const semanticMatchSchema = z.object({ product_id: z.string().nullable() });

/**
 * Three tiers, cheapest first (spec §11.2 step 6): pg_trgm similarity above
 * a high threshold auto-links at high confidence; a mid-range score links
 * but flags for review; below that, an LLM picks from a supplied shortlist
 * of trigram candidates (capped at medium — always goes to review, never
 * auto-approved) or returns no match.
 */
export async function matchIngredientToProduct(parsedName: string): Promise<MatchResult> {
  const candidates = await db
    .select({
      id: products.id,
      name: products.name,
      similarity: sql<number>`similarity(${products.name}, ${parsedName})`,
    })
    .from(products)
    .where(sql`${products.archivedAt} is null`)
    .orderBy(sql`similarity(${products.name}, ${parsedName}) desc`)
    .limit(SHORTLIST_SIZE);

  const best = candidates[0];
  if (best && best.similarity >= HIGH_THRESHOLD) {
    return { confidence: "high", productId: best.id };
  }
  if (best && best.similarity >= MEDIUM_THRESHOLD) {
    return { confidence: "medium", productId: best.id };
  }

  if (candidates.length === 0) {
    return { confidence: "unmatched", productId: null };
  }

  // Below trigram threshold: ask the model to pick from the shortlist only —
  // it may never invent a product or nutrition values (spec §11.4).
  const response = await getClient().messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    system:
      "You match a recipe ingredient name to the closest existing product in a supplied shortlist, or report no match. Only ever return a product_id that appears in the shortlist, or null. Never invent a product.",
    messages: [
      {
        role: "user",
        content: `Ingredient: "${parsedName}"\n\nShortlist:\n${candidates
          .map((c) => `${c.id}: ${c.name}`)
          .join("\n")}\n\nWhich product_id (if any) is the same food as the ingredient?`,
      },
    ],
    output_config: { format: zodOutputFormat(semanticMatchSchema) },
  });

  const productId = response.parsed_output?.product_id ?? null;
  if (!productId || !candidates.some((c) => c.id === productId)) {
    return { confidence: "unmatched", productId: null };
  }
  // Capped at medium even on an LLM-confirmed match — always reviewed, never auto-approved.
  return { confidence: "medium", productId };
}

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env } from "@/lib/env";
import { parseRecipeResultSchema, type ParseRecipeResult } from "./parse-schema";

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `You break a freeform recipe (pasted text, possibly Hebrew or English) into a structured ingredient list.

For each ingredient line, extract: the ingredient name (as plain text, no quantity/unit in it), the quantity, the unit, and a best-effort estimate of the quantity in grams if one can be reasonably derived (e.g. "2 cups flour" -> ~240g; "1 tbsp olive oil" -> ~14g). If a gram estimate can't be reasonably derived (e.g. "salt to taste", "1 onion" with no typical weight given), leave estimatedQuantityG null — never invent a number you're not reasonably confident in.

You are NOT matching ingredients to any product database — you have no access to one. Just extract what the text says. Do not resolve or invent product identities.

Also extract, if present in the text: a recipe name, a short description, number of servings, prep time in minutes, and the preparation instructions (as a single block of text, steps separated by newlines). Leave any of these null if not present in the pasted text — do not guess.

Return ONLY the JSON object matching the schema. No prose, no markdown fences.`;

export async function parseRecipeText(
  text: string
): Promise<{ parsed: ParseRecipeResult | null; raw: unknown }> {
  const response = await getClient().messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
    output_config: {
      format: zodOutputFormat(parseRecipeResultSchema),
    },
  });

  return { parsed: response.parsed_output, raw: response };
}

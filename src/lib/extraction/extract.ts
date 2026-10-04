import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env } from "@/lib/env";
import { extractionResultSchema, type ExtractionResult } from "./schema";

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `You transcribe nutrition facts panels from photographed food labels into strict JSON.

Labels are usually Hebrew (sometimes English). Transcribe product_name in its original script. The panel is often labeled "ל-100 גרם" (per 100g) or "למנה" (per serving) — read the basis field carefully and report which one the panel actually shows.

Israeli labels normally list energy in kcal, but some show kJ instead. If the panel shows kJ (or קילוג'ול), convert to kcal (kcal = kJ / 4.184) and note that you did so in the notes field. If serving_size_g is not printed on the label, leave it null — do not guess a number.

Return ONLY the JSON object matching the schema. No prose, no markdown fences.`;

export async function extractNutritionFromImage(params: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}): Promise<{ parsed: ExtractionResult | null; raw: unknown }> {
  const response = await getClient().messages.parse({
    model: "claude-sonnet-5-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: params.mediaType,
              data: params.imageBase64,
            },
          },
          {
            type: "text",
            text: "Extract the nutrition facts from this label photo.",
          },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(extractionResultSchema),
    },
  });

  return { parsed: response.parsed_output, raw: response };
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ingestRuns } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { isValidCronRequest } from "@/lib/cron/guard";
import { runSpoonacularIngest } from "@/lib/ingestion/ingest-pipeline";

const PAGE_SIZE = 20;

export async function POST(request: Request) {
  if (!isValidCronRequest(request)) {
    return apiError("unauthorized", "Invalid or missing cron secret", 401);
  }

  const [run] = await db
    .insert(ingestRuns)
    .values({ sourceName: "spoonacular", status: "running" })
    .returning();

  try {
    const result = await runSpoonacularIngest({ pageSize: PAGE_SIZE, offset: 0 });

    await db
      .update(ingestRuns)
      .set({
        status: "succeeded",
        finishedAt: new Date(),
        recipesFound: result.recipesFound,
        recipesCreated: result.recipesCreated,
        recipesSkipped: result.recipesSkipped,
      })
      .where(eq(ingestRuns.id, run.id));

    return apiData({ run: { ...run, ...result, status: "succeeded" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(ingestRuns)
      .set({ status: "failed", finishedAt: new Date(), error: message })
      .where(eq(ingestRuns.id, run.id));

    // A failed source doesn't abort the endpoint itself — it's logged and
    // reported, matching the spec's "a failed source leaves an ingest_runs
    // row with the error" acceptance criterion. Only one source exists this
    // phase, so there's nothing else to continue to, but the shape holds.
    return apiData({ run: { ...run, status: "failed", error: message } }, { status: 200 });
  }
}

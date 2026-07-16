import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products, extractionJobs } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { productInputSchema, kcalSanityWarning } from "@/lib/products/schema";
import { getProducts, isProductFilter } from "@/lib/products/get-products";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const filterParam = searchParams.get("filter") ?? undefined;
  const filter = isProductFilter(filterParam) ? filterParam : "all";

  const rows = await getProducts(q, filter);
  return apiData(rows);
}

export async function POST(request: Request) {
  let user;
  try {
    user = requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const body = await request.json();
  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", parsed.error.message, 400);
  }

  const input = parsed.data;
  const warning = kcalSanityWarning(input);

  let extractionJob = null;
  if (input.extractionJobId) {
    extractionJob = await db.query.extractionJobs.findFirst({
      where: eq(extractionJobs.id, input.extractionJobId),
    });
    if (!extractionJob || extractionJob.userId !== user.userId) {
      return apiError("not_found", "Extraction job not found", 404);
    }
    if (extractionJob.status !== "succeeded") {
      return apiError("validation_error", "Extraction job has not succeeded", 400);
    }
  }

  const [row] = await db
    .insert(products)
    .values({
      name: input.name,
      brand: input.brand,
      barcode: input.barcode,
      servingLabel: input.servingLabel,
      servingSizeG: input.servingSizeG?.toString(),
      kcalPer100g: input.kcalPer100g.toString(),
      proteinPer100g: input.proteinPer100g.toString(),
      carbsPer100g: input.carbsPer100g.toString(),
      fatPer100g: input.fatPer100g.toString(),
      fiberPer100g: input.fiberPer100g?.toString(),
      sugarPer100g: input.sugarPer100g?.toString(),
      sodiumMgPer100g: input.sodiumMgPer100g?.toString(),
      // The model never writes a product row directly — this insert only
      // happens after the human has reviewed and confirmed the extraction.
      source: extractionJob ? "image" : "manual",
      imagePath: extractionJob?.imagePath,
      isVerified: true,
      createdBy: user.userId,
    })
    .returning();

  if (extractionJob) {
    await db
      .update(extractionJobs)
      .set({ productId: row.id, updatedAt: new Date() })
      .where(eq(extractionJobs.id, extractionJob.id));
  }

  return apiData({ product: row, warning }, { status: 201 });
}

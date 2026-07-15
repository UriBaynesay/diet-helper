import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { extractionJobs } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { processExtractionJob } from "@/lib/extraction/process-job";

const MIME_BY_EXT: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  let user;
  try {
    user = requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const { jobId } = await params;
  const job = await db.query.extractionJobs.findFirst({ where: eq(extractionJobs.id, jobId) });
  if (!job || job.userId !== user.userId) {
    return apiError("not_found", "Extraction job not found", 404);
  }

  const mediaType = MIME_BY_EXT[path.extname(job.imagePath).toLowerCase()];
  if (!mediaType) {
    return apiError("unsupported", "Stored image format can't be retried", 400);
  }

  const stored = await readFile(
    path.join(/* turbopackIgnore: true */ process.cwd(), job.imagePath)
  );

  // Retries against the already-stored image — no re-upload, per spec.
  await processExtractionJob({
    jobId: job.id,
    imageBase64: stored.toString("base64"),
    mediaType,
  });

  const updated = await db.query.extractionJobs.findFirst({ where: eq(extractionJobs.id, jobId) });
  return apiData({ job: updated });
}

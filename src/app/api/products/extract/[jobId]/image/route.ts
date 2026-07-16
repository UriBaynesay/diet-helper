import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { extractionJobs } from "@/db/schema";
import { apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
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

  const contentType = CONTENT_TYPE_BY_EXT[path.extname(job.imagePath).toLowerCase()];
  if (!contentType) {
    return apiError("unsupported", "Stored image format can't be served", 400);
  }

  const buffer = await readFile(
    path.join(/* turbopackIgnore: true */ process.cwd(), job.imagePath)
  );

  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
  });
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { extractionJobs } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";

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

  return apiData({ job });
}

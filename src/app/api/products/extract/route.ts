import { db } from "@/db";
import { extractionJobs } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { ACCEPTED_MIME_TYPES, MAX_UPLOAD_BYTES, storeExtractionImage } from "@/lib/extraction/storage";
import { processExtractionJob } from "@/lib/extraction/process-job";

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

  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) {
    return apiError("validation_error", "image field is required", 400);
  }
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return apiError("validation_error", "Accepted types: jpeg, png, webp, heic", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return apiError("validation_error", "Image exceeds 10MB limit", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { imagePath, storedMimeType, storedBuffer } = await storeExtractionImage(buffer, file.type);

  const [job] = await db
    .insert(extractionJobs)
    .values({ userId: user.userId, imagePath, status: "pending" })
    .returning();

  const imageBase64 = storedBuffer.toString("base64");

  // Personal-app volume: process inline rather than standing up a queue.
  // The job row + polling endpoint still give the client a consistent
  // pending/processing/succeeded/failed contract regardless.
  await processExtractionJob({
    jobId: job.id,
    imageBase64,
    mediaType: storedMimeType as "image/jpeg" | "image/png" | "image/webp",
  });

  return apiData({ jobId: job.id }, { status: 201 });
}

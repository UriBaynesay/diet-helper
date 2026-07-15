import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_LONG_EDGE = 1568;

export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

/**
 * Downscales to at most 1568px on the long edge (cost/latency, per spec) and
 * persists to the local uploads volume. Returns the stored path and the
 * media type Claude should be told about (heic is converted to jpeg since
 * the vision API doesn't accept it directly).
 */
export async function storeExtractionImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ imagePath: string; storedMimeType: string; storedBuffer: Buffer }> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const isHeic = mimeType === "image/heic";
  const outputMimeType = isHeic ? "image/jpeg" : mimeType;
  const ext = isHeic ? "jpg" : EXT_BY_MIME[mimeType];

  let pipeline = sharp(buffer).resize({
    width: MAX_LONG_EDGE,
    height: MAX_LONG_EDGE,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (outputMimeType === "image/jpeg") pipeline = pipeline.jpeg({ quality: 90 });
  else if (outputMimeType === "image/png") pipeline = pipeline.png();
  else if (outputMimeType === "image/webp") pipeline = pipeline.webp({ quality: 90 });

  const output = await pipeline.toBuffer();

  const filename = `${randomUUID()}.${ext}`;
  const fullPath = path.join(UPLOAD_DIR, filename);
  await writeFile(fullPath, output);

  return {
    imagePath: path.join("data", "uploads", filename),
    storedMimeType: outputMimeType,
    storedBuffer: output,
  };
}

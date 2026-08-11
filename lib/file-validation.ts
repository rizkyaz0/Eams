import { Buffer } from "node:buffer";

export type DetectedImageType = "jpeg" | "png" | "webp";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_CONTENT_LENGTH_BYTES = MAX_UPLOAD_BYTES + 200 * 1024; // multipart overhead allowance

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Detect image type from magic bytes. Returns null for anything that is not
 * JPEG/PNG/WebP (including SVG — no matching magic) (SEC-10).
 */
export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_MAGIC)) {
    return "png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/** Map detected type → canonical file extension and Content-Type. */
export const IMAGE_EXT_BY_TYPE: Record<DetectedImageType, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};
export const IMAGE_CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

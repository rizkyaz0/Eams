// app/api/assets/[id]/images/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { requireRole } from "@/lib/security";
import { UserRole } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "node:crypto";
import {
  detectImageType,
  IMAGE_EXT_BY_TYPE,
  MAX_UPLOAD_BYTES,
  MAX_CONTENT_LENGTH_BYTES,
} from "@/lib/file-validation";

/**
 * POST /api/assets/[id]/images - Upload an asset image.
 * SEC-10 magic-byte allowlist (jpeg|png|webp, SVG rejected), SEC-11 5 MB cap
 * (Content-Length pre-check before parse + file.size after), SEC-12 storage
 * outside public/ under a server-generated random name.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;

    // Early size guard: reject oversized bodies BEFORE formData() buffers them (SEC-11).
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_CONTENT_LENGTH_BYTES) {
      return errorResponse("File too large", 413);
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file uploaded", 400);
    }

    const asset = await db.asset.findUnique({ where: { id } });
    if (!asset) return notFoundResponse("Asset not found");

    // Size cap after parse (SEC-11)
    if (file.size > MAX_UPLOAD_BYTES) {
      return errorResponse("File too large", 413);
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Magic-byte validation — SVG and everything else not in the allowlist is rejected (SEC-10)
    const type = detectImageType(buffer);
    if (!type) {
      return errorResponse("Unsupported file type", 400);
    }

    // Server-generated random name; extension derived from detected magic bytes, never the client (SEC-12)
    const ext = IMAGE_EXT_BY_TYPE[type];
    const fileName = `${randomUUID()}.${ext}`;

    // Store outside public/ — not reachable via any static URL (SEC-12)
    const uploadDir = join(process.cwd(), "uploads", "assets");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, fileName), buffer);

    // Internal relative path — served through the authenticated route only (SEC-13)
    await db.asset.update({
      where: { id },
      data: { imagePath: `uploads/assets/${fileName}` },
    });

    return successResponse({ path: `/api/assets/images/${fileName}` }, "Image uploaded successfully", 201);
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse("Failed to upload image", 500);
  }
}

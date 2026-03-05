// app/api/assets/[id]/images/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api-response";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file uploaded", 400);
    }

    const asset = await db.asset.findUnique({ where: { id } });
    if (!asset) return notFoundResponse("Asset not found");

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save directly to public/uploads/assets directory
    const uploadDir = join(process.cwd(), "public", "uploads", "assets");
    await mkdir(uploadDir, { recursive: true });

    // Clean up filename and add timestamp
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${id}-${Date.now()}-${cleanFileName}`;
    const path = join(uploadDir, fileName);

    await writeFile(path, buffer);
    const publicPath = `/uploads/assets/${fileName}`;

    // Update asset image path in the database
    await db.asset.update({
      where: { id },
      data: { imagePath: publicPath },
    });

    return successResponse({ path: publicPath }, "Image uploaded successfully");
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse("Failed to upload image", 500);
  }
}

// app/api/assets/images/[name]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, resolve } from "path";
import { requireUser } from "@/lib/security";
import { IMAGE_CONTENT_TYPE_BY_EXT } from "@/lib/file-validation";

const UPLOAD_ROOT = join(process.cwd(), "uploads", "assets");
// UUID + allowlisted extension only — path-traversal is structurally impossible.
const NAME_PATTERN = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;

/**
 * GET /api/assets/images/[name] - Serve an uploaded asset image.
 * Authenticated only (SEC-13); name is a server-generated UUID + allowlisted
 * extension so traversal cannot resolve; validated Content-Type from the
 * extension, inline Content-Disposition, and nosniff.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { response } = await requireUser();
  if (response) return response;
  const { name } = await params;
  if (!NAME_PATTERN.test(name)) return new NextResponse("Not found", { status: 404 });
  const filePath = resolve(UPLOAD_ROOT, name);
  // Belt-and-braces: resolved path must stay under the upload root.
  if (!filePath.startsWith(resolve(UPLOAD_ROOT))) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await readFile(filePath);
    const ext = name.split(".").pop()!;
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": IMAGE_CONTENT_TYPE_BY_EXT[ext],
        "Content-Disposition": `inline; filename="${name}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

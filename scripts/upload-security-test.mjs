// scripts/upload-security-test.mjs
// TEST-05: upload security gates.
// Part A (always): pure magic-byte validator — jpeg/png/webp accepted, SVG/empty rejected.
// Part B (live, only when a dev server responds on PORT 3000): 401 anonymous,
// 403 below STAFF_ASSET, 400 SVG, 413 >5MB, 201 valid upload, 200 + nosniff via
// the authenticated serve route, 404 static URL, 404 path traversal. Cleanup
// removes the uploaded file and restores the asset's imagePath.
// Run via `npm run verify:upload-security` (tsx resolves the TS lib import).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { unlink } from "fs/promises";
import { join } from "path";
// Default import: the TS lib is transpiled to CJS by tsx, so its exports are
// exposed on the default binding — call `fileValidation.detectImageType`.
import fileValidation from "../lib/file-validation.ts";

const { detectImageType, MAX_UPLOAD_BYTES } = fileValidation;

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const BASE_URL = "http://localhost:3000";

let failures = 0;
const results = [];

function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  results.push({ label, ok, actual, expected });
}

function logResult(r) {
  console.log(
    `${r.ok ? "PASS" : "FAIL"} ${r.label}: expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)}`
  );
}

// ---------- Part A: pure validator (always runs) ----------
console.log("== Part A: magic-byte validator ==");
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const WEBP = Buffer.from("RIFF\x10\x00\x00\x00WEBPVP8 ", "latin1");
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');

check("jpeg magic -> jpeg", detectImageType(JPEG), "jpeg");
check("png magic -> png", detectImageType(PNG), "png");
check("webp magic -> webp", detectImageType(WEBP), "webp");
check("svg text -> null (rejected)", detectImageType(SVG), null);
check("empty buffer -> null (rejected)", detectImageType(Buffer.alloc(0)), null);
check("MAX_UPLOAD_BYTES is 5 MB", MAX_UPLOAD_BYTES, 5 * 1024 * 1024);
results.forEach(logResult);

// ---------- Part B: live HTTP smoke (only if a dev server is up) ----------
async function serverUp() {
  try {
    const res = await fetch(`${BASE_URL}/login`, { method: "GET", redirect: "manual" });
    return typeof res.status === "number";
  } catch {
    return false;
  }
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) throw new Error(`login failed for ${email}: HTTP ${res.status}`);
  const setCookie = res.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0];
  if (!cookie.startsWith("auth-token=")) throw new Error(`no auth-token cookie for ${email}`);
  return cookie;
}

function uploadForm(buffer) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "image/jpeg" }), "test.jpg");
  return form;
}

async function runPartB(assetId) {
  console.log("== Part B: live HTTP smoke ==");
  if (!assetId) {
    console.log("SKIP Part B: no asset row in DB to upload against (seed first)");
    return;
  }

  // 1. Anonymous POST -> 401 (proxy deny-by-default)
  let res = await fetch(`${BASE_URL}/api/assets/${assetId}/images`, {
    method: "POST",
    body: uploadForm(JPEG),
  });
  check("anonymous POST -> 401", res.status, 401);

  // 2. Admin login; EMPLOYEE login for the 403 gate (below STAFF_ASSET)
  const adminCookie = await login("admin@eams.com", "password123");
  const employeeCookie = await login("siti.hr@eams.com", "password123");

  // 3. EMPLOYEE (below STAFF_ASSET) POST -> 403 (SEC-11 role gate)
  res = await fetch(`${BASE_URL}/api/assets/${assetId}/images`, {
    method: "POST",
    body: uploadForm(JPEG),
    headers: { cookie: employeeCookie },
  });
  check("employee POST -> 403", res.status, 403);

  // 4. Admin uploads SVG -> 400 (SEC-10)
  res = await fetch(`${BASE_URL}/api/assets/${assetId}/images`, {
    method: "POST",
    body: uploadForm(SVG),
    headers: { cookie: adminCookie },
  });
  check("svg upload -> 400", res.status, 400);

  // 5. Admin uploads jpeg padded past 5 MB -> 413 (SEC-11)
  const oversized = Buffer.concat([JPEG, Buffer.alloc(MAX_UPLOAD_BYTES + 1 - JPEG.length)]);
  res = await fetch(`${BASE_URL}/api/assets/${assetId}/images`, {
    method: "POST",
    body: uploadForm(oversized),
    headers: { cookie: adminCookie },
  });
  check(">5MB upload -> 413", res.status, 413);

  // 6. Admin uploads valid tiny jpeg -> 201 with serve-route path (SEC-10/12)
  res = await fetch(`${BASE_URL}/api/assets/${assetId}/images`, {
    method: "POST",
    body: uploadForm(JPEG),
    headers: { cookie: adminCookie },
  });
  const uploadBody = await res.json();
  const uploadedPath = uploadBody?.data?.path;
  check("valid jpeg upload -> 201", res.status, 201);
  check("upload path is serve route", typeof uploadedPath === "string" ? uploadedPath.startsWith("/api/assets/images/") : false, true);
  const uploadedName = typeof uploadedPath === "string" ? uploadedPath.split("/").pop() : null;

  try {
    // 7. Serve route with cookie -> 200 + nosniff + validated Content-Type (SEC-13)
    res = await fetch(`${BASE_URL}${uploadedPath}`, { headers: { cookie: adminCookie } });
    check("serve route -> 200", res.status, 200);
    check("serve nosniff header", res.headers.get("x-content-type-options"), "nosniff");
    check("serve content-type image/jpeg", res.headers.get("content-type"), "image/jpeg");

    // 8. Static URL for the new file -> 404 (stored outside public/, SEC-12)
    res = await fetch(`${BASE_URL}/uploads/assets/${uploadedName}`, { headers: { cookie: adminCookie } });
    check("static /uploads/assets/<name> -> 404", res.status, 404);

    // 9. Path traversal via serve route -> 404 (SEC-13)
    res = await fetch(`${BASE_URL}/api/assets/images/..%2F..%2F.env`, { headers: { cookie: adminCookie } });
    check("path traversal -> 404", res.status, 404);
  } finally {
    // Cleanup: remove uploaded file, restore the asset's imagePath
    if (uploadedName) {
      try {
        await unlink(join(process.cwd(), "uploads", "assets", uploadedName));
      } catch (e) {
        console.log(`NOTE: cleanup unlink skipped (${e?.message ?? e})`);
      }
    }
    await prisma.asset.update({
      where: { id: assetId },
      data: { imagePath: null },
    });
  }

  results.filter((r) => !r.ok).forEach(logResult);
}

async function main() {
  try {
    if (await serverUp()) {
      const asset = await prisma.asset.findFirst();
      await runPartB(asset?.id ?? null);
    } else {
      console.log("SKIP Part B: no dev server on http://localhost:3000 (Part A is the primary gate)");
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(failures === 0 ? "\nALL UPLOAD-SECURITY CHECKS PASSED" : `\n${failures} UPLOAD-SECURITY CHECK(S) FAILED`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("FAIL:", e?.message ?? e);
  process.exit(1);
});

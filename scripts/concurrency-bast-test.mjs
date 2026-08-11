// scripts/concurrency-bast-test.mjs
// TEST-06: 12 parallel BAST creates must yield 12 unique numbers, zero failures.
// Run via `npm run verify:bast-concurrency` (tsx resolves the TS service import).
// Cleanup restores the DB: created BASTs are deleted (bastDetail cascades) and
// the monthly counter is restored to its pre-test value.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
// Default import: the TS service is transpiled to CJS by tsx, so its exports are
// exposed on the default binding — call `bastService.createBastService`.
import bastService from "../lib/services/bast-service.ts";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const now = new Date();
const PERIOD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const NUM_CREATES = 12;

async function main() {
  // Capture the counter row state before the test so it can be restored after.
  const counterBefore = await prisma.bastNumberCounter.findUnique({
    where: { period: PERIOD },
  });

  // Actor: admin user from DB (creator identity comes from the session actor).
  const admin = await prisma.user.findUnique({ where: { email: "admin@eams.com" } });
  if (!admin) throw new Error("admin@eams.com not found — run the seed first");
  const actor = { userId: admin.id, fullName: admin.fullName, role: admin.role };

  // Item: first available asset.
  const asset = await prisma.asset.findFirst();
  if (!asset) throw new Error("no assets in DB — run the seed first");
  const items = [{ assetId: asset.id, conditionAfter: "GOOD" }];

  const created = [];

  try {
    const settled = await Promise.allSettled(
      Array.from({ length: NUM_CREATES }, () =>
        bastService.createBastService(
          { type: "ASSIGNMENT", recipientName: "Concurrency Test", recipientPosition: "QA", items },
          actor
        )
      )
    );

    const rejected = settled.filter((s) => s.status === "rejected");
    if (rejected.length > 0) {
      throw new Error(
        `${rejected.length}/${NUM_CREATES} creates failed: ${rejected
          .map((r) => r.reason?.message ?? r.reason)
          .join(" | ")}`
      );
    }

    for (const s of settled) {
      if (s.status === "fulfilled") created.push({ id: s.value.id, bastNumber: s.value.bastNumber });
    }

    // Asserts: zero failures, 12 unique numbers, correct format.
    if (created.length !== NUM_CREATES) {
      throw new Error(`expected ${NUM_CREATES} results, got ${created.length}`);
    }
    const numbers = created.map((c) => c.bastNumber);
    const unique = new Set(numbers);
    if (unique.size !== NUM_CREATES) {
      throw new Error(
        `expected ${NUM_CREATES} unique bastNumbers, got ${unique.size}: ${JSON.stringify(numbers)}`
      );
    }
    for (const n of numbers) {
      if (!/^BAST\/\d{4}\/\d{2}\/\d{4}$/.test(n)) throw new Error(`malformed bastNumber: ${n}`);
    }

    console.log(`PASS: ${NUM_CREATES} unique BAST numbers, 0 failures`);
    console.log(`Numbers: ${numbers.join(", ")}`);
  } finally {
    // Cleanup: delete the created BASTs (bastDetail cascades) and restore the
    // counter row to its pre-test value so real numbering is unaffected.
    if (created.length > 0) {
      await prisma.bast.deleteMany({ where: { id: { in: created.map((c) => c.id) } } });
    }
    if (counterBefore) {
      await prisma.bastNumberCounter.update({
        where: { period: PERIOD },
        data: { lastNumber: counterBefore.lastNumber },
      });
    } else {
      await prisma.bastNumberCounter.deleteMany({ where: { period: PERIOD } });
    }
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("FAIL:", e?.message ?? e);
  process.exit(1);
});

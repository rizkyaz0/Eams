import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding with Raw SQL...");

  // Cleanup
  console.log("Cleaning tables...");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "BastDetail", "Bast", "Maintenance", "Asset", "Location", "Category", "User", "Division" RESTART IDENTITY CASCADE;`);

  console.log("Inserting Divisions...");
  await prisma.$executeRawUnsafe(`INSERT INTO "Division" ("id", "code", "name", "description", "updatedAt") VALUES
('cm6xx12340001xyz5678div01', 'IT', 'Information Technology', 'IT Department', NOW()),
('cm6xx12340001xyz5678div02', 'HR', 'Human Resources', 'HR Department', NOW()),
('cm6xx12340001xyz5678div03', 'FIN', 'Finance', 'Finance Department', NOW());`);

  console.log("Inserting Users...");
  // Password hash for 'password123' (generated: $2b$12$xbuCyEuAMbDbg.6R4DojBe2AsE9Z6zLl8iOx3/tTRiCfwZfxMImqC)
  const hash = "$2b$12$xbuCyEuAMbDbg.6R4DojBe2AsE9Z6zLl8iOx3/tTRiCfwZfxMImqC";
  await prisma.$executeRawUnsafe(`INSERT INTO "User" ("id", "email", "fullName", "password", "role", "nip", "divisionId", "updatedAt") VALUES
('cm6xx12340001xyz5678usr01', 'admin@eams.com', 'Super Admin', '${hash}', 'SUPER_ADMIN', 'ADM001', 'cm6xx12340001xyz5678div01', NOW()),
('cm6xx12340001xyz5678usr02', 'staff.it@eams.com', 'Budi Santoso', '${hash}', 'STAFF_ASSET', 'IT002', 'cm6xx12340001xyz5678div01', NOW()),
('cm6xx12340001xyz5678usr03', 'siti.hr@eams.com', 'Siti Aminah', '${hash}', 'EMPLOYEE', 'HR005', 'cm6xx12340001xyz5678div02', NOW());`);

  console.log("Inserting Categories...");
  await prisma.$executeRawUnsafe(`INSERT INTO "Category" ("id", "name") VALUES
('cm6xx12340001xyz5678cat01', 'Electronics'),
('cm6xx12340001xyz5678cat02', 'Furniture'),
('cm6xx12340001xyz5678cat03', 'Vehicles'),
('cm6xx12340001xyz5678cat04', 'Stationery');`);

  console.log("Inserting Locations...");
  await prisma.$executeRawUnsafe(`INSERT INTO "Location" ("id", "name", "address", "description", "updatedAt") VALUES
('cm6xx12340001xyz5678loc01', 'Head Office', 'Jl. Sudirman No. 1, Jakarta', 'Main HQ', NOW()),
('cm6xx12340001xyz5678loc02', 'Branch Bandung', 'Jl. Asia Afrika No. 10, Bandung', 'Bandung Branch', NOW()),
('cm6xx12340001xyz5678loc03', 'Warehouse', 'Kawasan Industri Cikarang', 'Main Warehouse', NOW());`);

  console.log("Inserting Assets...");
  await prisma.$executeRawUnsafe(`INSERT INTO "Asset" ("id", "name", "tagNumber", "categoryId", "locationId", "status", "condition", "purchaseDate", "purchasePrice", "description", "updatedAt") VALUES
('cm6xx12340001xyz5678ast01', 'MacBook Pro M3', 'AST-IT-001', 'cm6xx12340001xyz5678cat01', 'cm6xx12340001xyz5678loc01', 'AVAILABLE', 'GOOD', '2024-01-15', 25000000, 'Admin Laptop', NOW()),
('cm6xx12340001xyz5678ast02', 'Dell XPS 15', 'AST-IT-002', 'cm6xx12340001xyz5678cat01', 'cm6xx12340001xyz5678loc01', 'IN_USE', 'GOOD', '2023-11-20', 22000000, 'Dev Laptop', NOW()),
('cm6xx12340001xyz5678ast03', 'Herman Miller Chair', 'AST-FUR-001', 'cm6xx12340001xyz5678cat02', 'cm6xx12340001xyz5678loc01', 'AVAILABLE', 'GOOD', '2023-06-10', 15000000, 'Director Chair', NOW()),
('cm6xx12340001xyz5678ast04', 'Toyota Avanza', 'AST-VEH-001', 'cm6xx12340001xyz5678cat03', 'cm6xx12340001xyz5678loc03', 'AVAILABLE', 'GOOD', '2022-05-05', 250000000, 'Silver, Matic', NOW()),
('cm6xx12340001xyz5678ast05', 'Epson Projector', 'AST-ELE-005', 'cm6xx12340001xyz5678cat01', 'cm6xx12340001xyz5678loc02', 'IN_MAINTENANCE', 'MINOR_DAMAGE', '2021-08-15', 5000000, 'Meeting Room Projector', NOW());`);

  console.log("Updating Asset Holder...");
  await prisma.$executeRawUnsafe(`UPDATE "Asset" SET "holderId" = 'cm6xx12340001xyz5678usr02' WHERE "tagNumber" = 'AST-IT-002';`);

  console.log("Inserting BAST...");
  await prisma.$executeRawUnsafe(`INSERT INTO "Bast" ("id", "bastNumber", "type", "status", "effectiveDate", "recipientName", "recipientPosition", "creatorId", "approverId", "approvedAt", "updatedAt") VALUES
('cm6xx12340001xyz5678bas01', 'BAST/2024/001', 'ASSIGNMENT', 'APPROVED', NOW(), 'Budi Santoso', 'IT Staff', 'cm6xx12340001xyz5678usr01', 'cm6xx12340001xyz5678usr01', NOW(), NOW());`);

  await prisma.$executeRawUnsafe(`INSERT INTO "BastDetail" ("id", "bastId", "assetId", "conditionBefore", "conditionAfter", "description") VALUES
('cm6xx12340001xyz5678dtl01', 'cm6xx12340001xyz5678bas01', 'cm6xx12340001xyz5678ast02', 'GOOD', 'GOOD', 'Handover laptop for development');`);

  console.log("Inserting Maintenance...");
  await prisma.$executeRawUnsafe(`INSERT INTO "Maintenance" ("id", "assetId", "description", "startDate", "status", "cost", "vendorName", "updatedAt") VALUES
('cm6xx12340001xyz5678mnt01', 'cm6xx12340001xyz5678ast05', 'Lens cleaning and bulb replacement', NOW(), 'IN_PROGRESS', 500000, 'Epson Service Center', NOW());`);

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

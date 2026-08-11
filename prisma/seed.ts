// prisma/seed.ts
// Idempotent upsert-based seed (DATA-01). Every record is upserted keyed on its
// fixed id (or the BastDetail composite key), so re-running this script updates
// records in place and NEVER wipes data. The destructive raw-SQL table-reset
// approach was removed in Phase 3.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding with idempotent upserts...");

  console.log("Upserting Divisions...");
  await prisma.division.upsert({
    where: { id: "cm6xx12340001xyz5678div01" },
    create: { id: "cm6xx12340001xyz5678div01", code: "IT", name: "Information Technology", description: "IT Department" },
    update: { code: "IT", name: "Information Technology", description: "IT Department" },
  });
  await prisma.division.upsert({
    where: { id: "cm6xx12340001xyz5678div02" },
    create: { id: "cm6xx12340001xyz5678div02", code: "HR", name: "Human Resources", description: "HR Department" },
    update: { code: "HR", name: "Human Resources", description: "HR Department" },
  });
  await prisma.division.upsert({
    where: { id: "cm6xx12340001xyz5678div03" },
    create: { id: "cm6xx12340001xyz5678div03", code: "FIN", name: "Finance", description: "Finance Department" },
    update: { code: "FIN", name: "Finance", description: "Finance Department" },
  });

  console.log("Upserting Users...");
  // Password hash for 'password123' (generated: $2b$12$xbuCyEuAMbDbg.6R4DojBe2AsE9Z6zLl8iOx3/tTRiCfwZfxMImqC)
  const hash = "$2b$12$xbuCyEuAMbDbg.6R4DojBe2AsE9Z6zLl8iOx3/tTRiCfwZfxMImqC";
  await prisma.user.upsert({
    where: { id: "cm6xx12340001xyz5678usr01" },
    create: { id: "cm6xx12340001xyz5678usr01", email: "admin@eams.com", fullName: "Super Admin", password: hash, role: "SUPER_ADMIN", nip: "ADM001", divisionId: "cm6xx12340001xyz5678div01" },
    update: { email: "admin@eams.com", fullName: "Super Admin", password: hash, role: "SUPER_ADMIN", nip: "ADM001", divisionId: "cm6xx12340001xyz5678div01" },
  });
  await prisma.user.upsert({
    where: { id: "cm6xx12340001xyz5678usr02" },
    create: { id: "cm6xx12340001xyz5678usr02", email: "staff.it@eams.com", fullName: "Budi Santoso", password: hash, role: "STAFF_ASSET", nip: "IT002", divisionId: "cm6xx12340001xyz5678div01" },
    update: { email: "staff.it@eams.com", fullName: "Budi Santoso", password: hash, role: "STAFF_ASSET", nip: "IT002", divisionId: "cm6xx12340001xyz5678div01" },
  });
  await prisma.user.upsert({
    where: { id: "cm6xx12340001xyz5678usr03" },
    create: { id: "cm6xx12340001xyz5678usr03", email: "siti.hr@eams.com", fullName: "Siti Aminah", password: hash, role: "EMPLOYEE", nip: "HR005", divisionId: "cm6xx12340001xyz5678div02" },
    update: { email: "siti.hr@eams.com", fullName: "Siti Aminah", password: hash, role: "EMPLOYEE", nip: "HR005", divisionId: "cm6xx12340001xyz5678div02" },
  });

  console.log("Upserting Categories...");
  await prisma.category.upsert({
    where: { id: "cm6xx12340001xyz5678cat01" },
    create: { id: "cm6xx12340001xyz5678cat01", name: "Electronics" },
    update: { name: "Electronics" },
  });
  await prisma.category.upsert({
    where: { id: "cm6xx12340001xyz5678cat02" },
    create: { id: "cm6xx12340001xyz5678cat02", name: "Furniture" },
    update: { name: "Furniture" },
  });
  await prisma.category.upsert({
    where: { id: "cm6xx12340001xyz5678cat03" },
    create: { id: "cm6xx12340001xyz5678cat03", name: "Vehicles" },
    update: { name: "Vehicles" },
  });
  await prisma.category.upsert({
    where: { id: "cm6xx12340001xyz5678cat04" },
    create: { id: "cm6xx12340001xyz5678cat04", name: "Stationery" },
    update: { name: "Stationery" },
  });

  console.log("Upserting Locations...");
  await prisma.location.upsert({
    where: { id: "cm6xx12340001xyz5678loc01" },
    create: { id: "cm6xx12340001xyz5678loc01", name: "Head Office", address: "Jl. Sudirman No. 1, Jakarta", description: "Main HQ" },
    update: { name: "Head Office", address: "Jl. Sudirman No. 1, Jakarta", description: "Main HQ" },
  });
  await prisma.location.upsert({
    where: { id: "cm6xx12340001xyz5678loc02" },
    create: { id: "cm6xx12340001xyz5678loc02", name: "Branch Bandung", address: "Jl. Asia Afrika No. 10, Bandung", description: "Bandung Branch" },
    update: { name: "Branch Bandung", address: "Jl. Asia Afrika No. 10, Bandung", description: "Bandung Branch" },
  });
  await prisma.location.upsert({
    where: { id: "cm6xx12340001xyz5678loc03" },
    create: { id: "cm6xx12340001xyz5678loc03", name: "Warehouse", address: "Kawasan Industri Cikarang", description: "Main Warehouse" },
    update: { name: "Warehouse", address: "Kawasan Industri Cikarang", description: "Main Warehouse" },
  });

  console.log("Upserting Assets...");
  await prisma.asset.upsert({
    where: { id: "cm6xx12340001xyz5678ast01" },
    create: { id: "cm6xx12340001xyz5678ast01", name: "MacBook Pro M3", tagNumber: "AST-IT-001", categoryId: "cm6xx12340001xyz5678cat01", locationId: "cm6xx12340001xyz5678loc01", status: "AVAILABLE", condition: "GOOD", purchaseDate: new Date("2024-01-15"), purchasePrice: 25000000, description: "Admin Laptop" },
    update: { name: "MacBook Pro M3", tagNumber: "AST-IT-001", categoryId: "cm6xx12340001xyz5678cat01", locationId: "cm6xx12340001xyz5678loc01", status: "AVAILABLE", condition: "GOOD", purchaseDate: new Date("2024-01-15"), purchasePrice: 25000000, description: "Admin Laptop" },
  });
  await prisma.asset.upsert({
    where: { id: "cm6xx12340001xyz5678ast02" },
    create: { id: "cm6xx12340001xyz5678ast02", name: "Dell XPS 15", tagNumber: "AST-IT-002", categoryId: "cm6xx12340001xyz5678cat01", locationId: "cm6xx12340001xyz5678loc01", status: "IN_USE", condition: "GOOD", purchaseDate: new Date("2023-11-20"), purchasePrice: 22000000, description: "Dev Laptop", holderId: "cm6xx12340001xyz5678usr02" },
    update: { name: "Dell XPS 15", tagNumber: "AST-IT-002", categoryId: "cm6xx12340001xyz5678cat01", locationId: "cm6xx12340001xyz5678loc01", status: "IN_USE", condition: "GOOD", purchaseDate: new Date("2023-11-20"), purchasePrice: 22000000, description: "Dev Laptop", holderId: "cm6xx12340001xyz5678usr02" },
  });
  await prisma.asset.upsert({
    where: { id: "cm6xx12340001xyz5678ast03" },
    create: { id: "cm6xx12340001xyz5678ast03", name: "Herman Miller Chair", tagNumber: "AST-FUR-001", categoryId: "cm6xx12340001xyz5678cat02", locationId: "cm6xx12340001xyz5678loc01", status: "AVAILABLE", condition: "GOOD", purchaseDate: new Date("2023-06-10"), purchasePrice: 15000000, description: "Director Chair" },
    update: { name: "Herman Miller Chair", tagNumber: "AST-FUR-001", categoryId: "cm6xx12340001xyz5678cat02", locationId: "cm6xx12340001xyz5678loc01", status: "AVAILABLE", condition: "GOOD", purchaseDate: new Date("2023-06-10"), purchasePrice: 15000000, description: "Director Chair" },
  });
  await prisma.asset.upsert({
    where: { id: "cm6xx12340001xyz5678ast04" },
    create: { id: "cm6xx12340001xyz5678ast04", name: "Toyota Avanza", tagNumber: "AST-VEH-001", categoryId: "cm6xx12340001xyz5678cat03", locationId: "cm6xx12340001xyz5678loc03", status: "AVAILABLE", condition: "GOOD", purchaseDate: new Date("2022-05-05"), purchasePrice: 250000000, description: "Silver, Matic" },
    update: { name: "Toyota Avanza", tagNumber: "AST-VEH-001", categoryId: "cm6xx12340001xyz5678cat03", locationId: "cm6xx12340001xyz5678loc03", status: "AVAILABLE", condition: "GOOD", purchaseDate: new Date("2022-05-05"), purchasePrice: 250000000, description: "Silver, Matic" },
  });
  await prisma.asset.upsert({
    where: { id: "cm6xx12340001xyz5678ast05" },
    create: { id: "cm6xx12340001xyz5678ast05", name: "Epson Projector", tagNumber: "AST-ELE-005", categoryId: "cm6xx12340001xyz5678cat01", locationId: "cm6xx12340001xyz5678loc02", status: "IN_MAINTENANCE", condition: "MINOR_DAMAGE", purchaseDate: new Date("2021-08-15"), purchasePrice: 5000000, description: "Meeting Room Projector" },
    update: { name: "Epson Projector", tagNumber: "AST-ELE-005", categoryId: "cm6xx12340001xyz5678cat01", locationId: "cm6xx12340001xyz5678loc02", status: "IN_MAINTENANCE", condition: "MINOR_DAMAGE", purchaseDate: new Date("2021-08-15"), purchasePrice: 5000000, description: "Meeting Room Projector" },
  });

  console.log("Upserting BAST...");
  // creatorId === approverId here is SEED data (approval already recorded), not a
  // live approval path — kept as-is to preserve existing data values.
  await prisma.bast.upsert({
    where: { id: "cm6xx12340001xyz5678bas01" },
    create: {
      id: "cm6xx12340001xyz5678bas01",
      bastNumber: "BAST/2024/001",
      type: "ASSIGNMENT",
      status: "APPROVED",
      effectiveDate: new Date(),
      recipientName: "Budi Santoso",
      recipientPosition: "IT Staff",
      creatorId: "cm6xx12340001xyz5678usr01",
      approverId: "cm6xx12340001xyz5678usr01",
      approvedAt: new Date(),
    },
    update: {
      bastNumber: "BAST/2024/001",
      type: "ASSIGNMENT",
      status: "APPROVED",
      effectiveDate: new Date(),
      recipientName: "Budi Santoso",
      recipientPosition: "IT Staff",
      creatorId: "cm6xx12340001xyz5678usr01",
      approverId: "cm6xx12340001xyz5678usr01",
      approvedAt: new Date(),
    },
  });

  await prisma.bastDetail.upsert({
    where: { bastId_assetId: { bastId: "cm6xx12340001xyz5678bas01", assetId: "cm6xx12340001xyz5678ast02" } },
    create: {
      id: "cm6xx12340001xyz5678dtl01",
      bastId: "cm6xx12340001xyz5678bas01",
      assetId: "cm6xx12340001xyz5678ast02",
      conditionBefore: "GOOD",
      conditionAfter: "GOOD",
      description: "Handover laptop for development",
    },
    update: {
      conditionBefore: "GOOD",
      conditionAfter: "GOOD",
      description: "Handover laptop for development",
    },
  });

  console.log("Upserting Maintenance...");
  await prisma.maintenance.upsert({
    where: { id: "cm6xx12340001xyz5678mnt01" },
    create: { id: "cm6xx12340001xyz5678mnt01", assetId: "cm6xx12340001xyz5678ast05", description: "Lens cleaning and bulb replacement", startDate: new Date(), status: "IN_PROGRESS", cost: 500000, vendorName: "Epson Service Center" },
    update: { assetId: "cm6xx12340001xyz5678ast05", description: "Lens cleaning and bulb replacement", startDate: new Date(), status: "IN_PROGRESS", cost: 500000, vendorName: "Epson Service Center" },
  });

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

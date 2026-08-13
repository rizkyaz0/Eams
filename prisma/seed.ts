// prisma/seed.ts
// Idempotent upsert-based seed for SMK (Vocational High School) theme.
// Divisions = 4 jurusan + Tata Usaha. Re-running updates records in place.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding (SMK theme)...");

  // ──────────────────────────────────────────────
  // DIVISIONS (Jurusan)
  // ──────────────────────────────────────────────
  console.log("Upserting Divisions...");
  const divisions = [
    { id: "smkdiv01", code: "TU",   name: "Tata Usaha",                              description: "Administrasi dan pengelolaan sekolah" },
    { id: "smkdiv02", code: "MPLB", name: "Manajemen Perkantoran dan Layanan Bisnis", description: "Jurusan manajemen perkantoran dan layanan bisnis" },
    { id: "smkdiv03", code: "TKT",  name: "Teknik Komputer dan Telekomunikasi",       description: "Jurusan teknik komputer, jaringan, dan telekomunikasi" },
    { id: "smkdiv04", code: "AKL",  name: "Akuntansi dan Keuangan Lembaga",           description: "Jurusan akuntansi, keuangan, dan perbankan" },
    { id: "smkdiv05", code: "PHT",  name: "Perhotelan",                               description: "Jurusan akomodasi perhotelan dan tata boga" },
  ];
  for (const d of divisions) {
    await prisma.division.upsert({
      where: { id: d.id },
      create: d,
      update: { code: d.code, name: d.name, description: d.description },
    });
  }

  // ──────────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────────
  console.log("Upserting Users...");
  // Password: admin123  →  bcrypt 12 rounds
  const hash = "$2b$12$Uee.NCK755coWH2sSI63kut7DDcoELTX7TU7GHyHfLtlBIirT1Uba";
  const users = [
    { id: "smkusr01", email: "admin@smk.sch.id",      fullName: "Ahmad Fauzi, S.Pd",     role: "SUPER_ADMIN",    nip: "197501012005011001", divisionId: "smkdiv01" },
    { id: "smkusr02", email: "staff.aset@smk.sch.id", fullName: "Dewi Rahmawati, A.Md",  role: "STAFF_ASSET",    nip: "198803052010012005", divisionId: "smkdiv01" },
    { id: "smkusr03", code: "MR MPLB", email: "kajur.mplb@smk.sch.id", fullName: "Rina Susanti, S.E",      role: "MR",          nip: "197809122003122003", divisionId: "smkdiv02" },
    { id: "smkusr04", email: "kajur.tkt@smk.sch.id",  fullName: "Hendra Wijaya, S.Kom",  role: "MR",             nip: "198205252006011012", divisionId: "smkdiv03" },
    { id: "smkusr05", email: "kajur.akl@smk.sch.id",  fullName: "Sri Lestari, S.E, Ak",  role: "MR",             nip: "197611142002122002", divisionId: "smkdiv04" },
    { id: "smkusr06", email: "kajur.pht@smk.sch.id",  fullName: "Bambang Kurniawan, S.Par", role: "MR",           nip: "198001012004011008", divisionId: "smkdiv05" },
    { id: "smkusr07", email: "teknisi@smk.sch.id",    fullName: "Rudi Hartono",           role: "TEKNISI",        nip: "199002152015011003", divisionId: "smkdiv03" },
    { id: "smkusr08", email: "guru.mplb@smk.sch.id",  fullName: "Yuni Astuti, S.Pd",      role: "EMPLOYEE",       nip: "198507212009012004", divisionId: "smkdiv02" },
    { id: "smkusr09", email: "guru.tkt@smk.sch.id",   fullName: "Agus Setiawan, S.Kom",   role: "EMPLOYEE",       nip: "199101052016011007", divisionId: "smkdiv03" },
  ];
  for (const u of users) {
    const { code: _code, ...data } = u as any;
    await prisma.user.upsert({
      where: { id: data.id },
      create: { ...data, password: hash },
      update: { ...data, password: hash },
    });
  }

  // ──────────────────────────────────────────────
  // CATEGORIES
  // ──────────────────────────────────────────────
  console.log("Upserting Categories...");
  const categories = [
    { id: "smkcat01", name: "Komputer & Laptop" },
    { id: "smkcat02", name: "Peralatan Jaringan" },
    { id: "smkcat03", name: "Peralatan Kantor" },
    { id: "smkcat04", name: "Furnitur" },
    { id: "smkcat05", name: "Peralatan Perhotelan" },
    { id: "smkcat06", name: "Kendaraan" },
    { id: "smkcat07", name: "Elektronik AV" },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      create: c,
      update: { name: c.name },
    });
  }

  // ──────────────────────────────────────────────
  // LOCATIONS
  // ──────────────────────────────────────────────
  console.log("Upserting Locations...");
  const locations = [
    { id: "smkloc01", name: "Ruang Tata Usaha",          address: "Gedung A Lt. 1", description: "Kantor administrasi sekolah" },
    { id: "smkloc02", name: "Lab Komputer TKT 1",         address: "Gedung B Lt. 1", description: "Laboratorium komputer dan jaringan TKT" },
    { id: "smkloc03", name: "Lab Komputer TKT 2",         address: "Gedung B Lt. 2", description: "Laboratorium komputer lanjutan TKT" },
    { id: "smkloc04", name: "Ruang Praktik MPLB",         address: "Gedung C Lt. 1", description: "Ruang simulasi kantor MPLB" },
    { id: "smkloc05", name: "Ruang Praktik AKL",          address: "Gedung C Lt. 2", description: "Ruang simulasi akuntansi dan keuangan" },
    { id: "smkloc06", name: "Ruang Praktik Perhotelan",   address: "Gedung D Lt. 1", description: "Simulasi kamar hotel dan front office" },
    { id: "smkloc07", name: "Ruang Guru",                 address: "Gedung A Lt. 2", description: "Ruang kerja guru dan staf pengajar" },
    { id: "smkloc08", name: "Aula Sekolah",               address: "Gedung E",       description: "Aula serbaguna" },
    { id: "smkloc09", name: "Gudang",                     address: "Gedung F",       description: "Gudang penyimpanan aset" },
  ];
  for (const l of locations) {
    await prisma.location.upsert({
      where: { id: l.id },
      create: l,
      update: { name: l.name, address: l.address, description: l.description },
    });
  }

  // ──────────────────────────────────────────────
  // ASSETS
  // ──────────────────────────────────────────────
  console.log("Upserting Assets...");
  const assets = [
    // TKT – Lab Komputer
    { id: "smkast01", name: "PC Desktop Acer Veriton",   tagNumber: "TKT-KOM-001", categoryId: "smkcat01", locationId: "smkloc02", divisionId: "smkdiv03", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2023-07-01"), purchasePrice: 8500000,   description: "Unit 1 Lab Komputer TKT", warrantyExpiry: new Date("2026-07-01") },
    { id: "smkast02", name: "PC Desktop Acer Veriton",   tagNumber: "TKT-KOM-002", categoryId: "smkcat01", locationId: "smkloc02", divisionId: "smkdiv03", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2023-07-01"), purchasePrice: 8500000,   description: "Unit 2 Lab Komputer TKT", warrantyExpiry: new Date("2026-07-01") },
    { id: "smkast03", name: "PC Desktop Acer Veriton",   tagNumber: "TKT-KOM-003", categoryId: "smkcat01", locationId: "smkloc02", divisionId: "smkdiv03", status: "IN_MAINTENANCE", condition: "MINOR_DAMAGE",  purchaseDate: new Date("2023-07-01"), purchasePrice: 8500000,   description: "Unit 3 Lab Komputer TKT – LCD rusak" },
    { id: "smkast04", name: "Laptop Lenovo ThinkPad E15", tagNumber: "TKT-LPT-001", categoryId: "smkcat01", locationId: "smkloc02", divisionId: "smkdiv03", status: "IN_USE",        condition: "GOOD",         purchaseDate: new Date("2024-01-10"), purchasePrice: 12500000,  description: "Laptop instruktur TKT", holderId: "smkusr04", warrantyExpiry: new Date("2027-01-10") },
    { id: "smkast05", name: "Cisco Switch 24-Port",       tagNumber: "TKT-NET-001", categoryId: "smkcat02", locationId: "smkloc02", divisionId: "smkdiv03", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2022-08-15"), purchasePrice: 4500000,   description: "Cisco Catalyst 2960 untuk lab jaringan" },
    { id: "smkast06", name: "MikroTik Router RB4011",     tagNumber: "TKT-NET-002", categoryId: "smkcat02", locationId: "smkloc02", divisionId: "smkdiv03", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2022-08-15"), purchasePrice: 3200000,   description: "Router utama lab jaringan TKT" },
    { id: "smkast07", name: "Patch Panel 24-Port",         tagNumber: "TKT-NET-003", categoryId: "smkcat02", locationId: "smkloc02", divisionId: "smkdiv03", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2022-09-01"), purchasePrice: 850000,    description: "Patch panel server rack TKT" },

    // MPLB – Ruang Praktik
    { id: "smkast08", name: "Mesin Fotokopi Ricoh MP2014", tagNumber: "MPLB-KAN-001", categoryId: "smkcat03", locationId: "smkloc04", divisionId: "smkdiv02", status: "IN_MAINTENANCE", condition: "MINOR_DAMAGE", purchaseDate: new Date("2021-03-20"), purchasePrice: 18000000,  description: "Mesin fotokopi ruang praktik MPLB" },
    { id: "smkast09", name: "Printer HP LaserJet Pro",     tagNumber: "MPLB-KAN-002", categoryId: "smkcat03", locationId: "smkloc04", divisionId: "smkdiv02", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2023-04-05"), purchasePrice: 3500000,   description: "Printer laser untuk praktik surat-menyurat" },
    { id: "smkast10", name: "PC Desktop ASUS",             tagNumber: "MPLB-KOM-001", categoryId: "smkcat01", locationId: "smkloc04", divisionId: "smkdiv02", status: "IN_USE",        condition: "GOOD",         purchaseDate: new Date("2023-07-01"), purchasePrice: 7800000,   description: "Komputer instruktur MPLB", holderId: "smkusr03" },
    { id: "smkast11", name: "Filing Cabinet 4 Laci",       tagNumber: "MPLB-FUR-001", categoryId: "smkcat04", locationId: "smkloc04", divisionId: "smkdiv02", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2020-11-10"), purchasePrice: 2200000,   description: "Lemari arsip praktik perkantoran" },
    { id: "smkast12", name: "Proyektor Epson EB-X51",      tagNumber: "MPLB-AV-001",  categoryId: "smkcat07", locationId: "smkloc04", divisionId: "smkdiv02", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2022-06-15"), purchasePrice: 5200000,   description: "Proyektor ruang kelas MPLB", warrantyExpiry: new Date("2025-06-15") },

    // AKL – Ruang Praktik
    { id: "smkast13", name: "PC Desktop Lenovo IdeaCentre", tagNumber: "AKL-KOM-001", categoryId: "smkcat01", locationId: "smkloc05", divisionId: "smkdiv04", status: "AVAILABLE",   condition: "GOOD",          purchaseDate: new Date("2023-07-01"), purchasePrice: 7500000,   description: "Komputer praktik akuntansi" },
    { id: "smkast14", name: "PC Desktop Lenovo IdeaCentre", tagNumber: "AKL-KOM-002", categoryId: "smkcat01", locationId: "smkloc05", divisionId: "smkdiv04", status: "AVAILABLE",   condition: "GOOD",          purchaseDate: new Date("2023-07-01"), purchasePrice: 7500000,   description: "Komputer praktik akuntansi 2" },
    { id: "smkast15", name: "Kalkulator Casio FC-200V",    tagNumber: "AKL-KAL-001", categoryId: "smkcat03", locationId: "smkloc05", divisionId: "smkdiv04", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2022-01-15"), purchasePrice: 550000,    description: "Kalkulator keuangan siswa AKL" },
    { id: "smkast16", name: "Mesin Kasir Epson TM-T82X",  tagNumber: "AKL-KAS-001", categoryId: "smkcat03", locationId: "smkloc05", divisionId: "smkdiv04", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2022-05-20"), purchasePrice: 1800000,   description: "Mesin kasir POS untuk praktik" },
    { id: "smkast17", name: "Filing Cabinet 2 Laci",       tagNumber: "AKL-FUR-001", categoryId: "smkcat04", locationId: "smkloc05", divisionId: "smkdiv04", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2021-08-01"), purchasePrice: 1400000,   description: "Lemari arsip dokumen keuangan" },

    // PHT – Ruang Praktik
    { id: "smkast18", name: "Set Tempat Tidur Praktik",    tagNumber: "PHT-KMR-001", categoryId: "smkcat05", locationId: "smkloc06", divisionId: "smkdiv05", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2021-06-10"), purchasePrice: 6500000,   description: "Tempat tidur + kasur + linen untuk simulasi kamar hotel" },
    { id: "smkast19", name: "Mesin Kopi Espresso DeLonghi", tagNumber: "PHT-DAP-001", categoryId: "smkcat05", locationId: "smkloc06", divisionId: "smkdiv05", status: "AVAILABLE",   condition: "GOOD",          purchaseDate: new Date("2023-09-15"), purchasePrice: 4800000,   description: "Mesin kopi untuk praktik F&B", warrantyExpiry: new Date("2025-09-15") },
    { id: "smkast20", name: "Trolley Housekeeping",         tagNumber: "PHT-HKP-001", categoryId: "smkcat05", locationId: "smkloc06", divisionId: "smkdiv05", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2021-06-10"), purchasePrice: 1200000,   description: "Trolley pembersih kamar hotel" },
    { id: "smkast21", name: "Komputer Front Office ASUS",  tagNumber: "PHT-KOM-001", categoryId: "smkcat01", locationId: "smkloc06", divisionId: "smkdiv05", status: "IN_USE",        condition: "GOOD",         purchaseDate: new Date("2023-07-01"), purchasePrice: 7800000,   description: "Komputer simulasi front office hotel", holderId: "smkusr06" },
    { id: "smkast22", name: "PABX Panasonic KX-TES824",   tagNumber: "PHT-TLP-001", categoryId: "smkcat05", locationId: "smkloc06", divisionId: "smkdiv05", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2020-11-20"), purchasePrice: 2800000,   description: "Sistem telepon internal hotel" },

    // Umum / TU
    { id: "smkast23", name: "Sound System TOA Aula",       tagNumber: "TU-AV-001",   categoryId: "smkcat07", locationId: "smkloc08", divisionId: "smkdiv01", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2022-02-28"), purchasePrice: 12000000,  description: "Sound system utama aula sekolah" },
    { id: "smkast24", name: "Proyektor Aula BenQ MH560",   tagNumber: "TU-AV-002",   categoryId: "smkcat07", locationId: "smkloc08", divisionId: "smkdiv01", status: "AVAILABLE",     condition: "GOOD",         purchaseDate: new Date("2023-02-14"), purchasePrice: 7500000,   description: "Proyektor full-HD aula", warrantyExpiry: new Date("2026-02-14") },
    { id: "smkast25", name: "Kendaraan Operasional Toyota Avanza", tagNumber: "TU-KDR-001", categoryId: "smkcat06", locationId: "smkloc09", divisionId: "smkdiv01", status: "AVAILABLE", condition: "GOOD", purchaseDate: new Date("2021-01-15"), purchasePrice: 230000000, description: "Mobil operasional sekolah, silver matic" },
  ];

  for (const a of assets) {
    await prisma.asset.upsert({
      where: { id: a.id },
      create: a as any,
      update: a as any,
    });
  }

  // ──────────────────────────────────────────────
  // BAST
  // ──────────────────────────────────────────────
  console.log("Upserting BAST...");
  // Remove any old BAST records that share our bastNumbers but have different IDs
  // (BastDetail cascades on Bast delete, so no need to delete details separately)
  await prisma.bast.deleteMany({
    where: {
      bastNumber: { in: ["BAST/2024/001", "BAST/2024/002"] },
      id: { notIn: ["smkbas01", "smkbas02"] },
    },
  });
  await prisma.bast.upsert({
    where: { id: "smkbas01" },
    create: {
      id: "smkbas01",
      bastNumber: "BAST/2024/001",
      type: "ASSIGNMENT",
      status: "APPROVED",
      effectiveDate: new Date("2024-07-15"),
      recipientName: "Hendra Wijaya, S.Kom",
      recipientPosition: "Ketua Jurusan TKT",
      creatorId: "smkusr02",
      approverId: "smkusr01",
      approvedAt: new Date("2024-07-15"),
      description: "Serah terima laptop instruktur TKT",
    },
    update: {
      bastNumber: "BAST/2024/001",
      type: "ASSIGNMENT",
      status: "APPROVED",
      effectiveDate: new Date("2024-07-15"),
      recipientName: "Hendra Wijaya, S.Kom",
      recipientPosition: "Ketua Jurusan TKT",
      creatorId: "smkusr02",
      approverId: "smkusr01",
      approvedAt: new Date("2024-07-15"),
      description: "Serah terima laptop instruktur TKT",
    },
  });

  await prisma.bastDetail.upsert({
    where: { bastId_assetId: { bastId: "smkbas01", assetId: "smkast04" } },
    create: {
      id: "smkdtl01",
      bastId: "smkbas01",
      assetId: "smkast04",
      conditionBefore: "GOOD",
      conditionAfter: "GOOD",
      description: "Laptop dalam kondisi baik, lengkap dengan charger",
    },
    update: {
      conditionBefore: "GOOD",
      conditionAfter: "GOOD",
      description: "Laptop dalam kondisi baik, lengkap dengan charger",
    },
  });

  await prisma.bast.upsert({
    where: { id: "smkbas02" },
    create: {
      id: "smkbas02",
      bastNumber: "BAST/2024/002",
      type: "ASSIGNMENT",
      status: "APPROVED",
      effectiveDate: new Date("2024-08-01"),
      recipientName: "Rina Susanti, S.E",
      recipientPosition: "Ketua Jurusan MPLB",
      creatorId: "smkusr02",
      approverId: "smkusr01",
      approvedAt: new Date("2024-08-01"),
      description: "Serah terima komputer instruktur MPLB",
    },
    update: {
      bastNumber: "BAST/2024/002",
      type: "ASSIGNMENT",
      status: "APPROVED",
      effectiveDate: new Date("2024-08-01"),
      recipientName: "Rina Susanti, S.E",
      recipientPosition: "Ketua Jurusan MPLB",
      creatorId: "smkusr02",
      approverId: "smkusr01",
      approvedAt: new Date("2024-08-01"),
      description: "Serah terima komputer instruktur MPLB",
    },
  });

  await prisma.bastDetail.upsert({
    where: { bastId_assetId: { bastId: "smkbas02", assetId: "smkast10" } },
    create: {
      id: "smkdtl02",
      bastId: "smkbas02",
      assetId: "smkast10",
      conditionBefore: "GOOD",
      conditionAfter: "GOOD",
      description: "PC Desktop kondisi baik, lengkap dengan monitor dan keyboard",
    },
    update: {
      conditionBefore: "GOOD",
      conditionAfter: "GOOD",
      description: "PC Desktop kondisi baik, lengkap dengan monitor dan keyboard",
    },
  });

  // ──────────────────────────────────────────────
  // MAINTENANCE
  // ──────────────────────────────────────────────
  console.log("Upserting Maintenance...");
  await prisma.maintenance.upsert({
    where: { id: "smkmnt01" },
    create: {
      id: "smkmnt01",
      assetId: "smkast08",
      description: "Servis berkala mesin fotokopi — penggantian drum dan toner",
      startDate: new Date("2026-08-01"),
      status: "IN_PROGRESS",
      cost: 1200000,
      vendorName: "Ricoh Service Center",
    },
    update: {
      assetId: "smkast08",
      description: "Servis berkala mesin fotokopi — penggantian drum dan toner",
      startDate: new Date("2026-08-01"),
      status: "IN_PROGRESS",
      cost: 1200000,
      vendorName: "Ricoh Service Center",
    },
  });

  await prisma.maintenance.upsert({
    where: { id: "smkmnt02" },
    create: {
      id: "smkmnt02",
      assetId: "smkast03",
      description: "Penggantian LCD monitor PC TKT unit 3",
      startDate: new Date("2026-07-28"),
      status: "IN_PROGRESS",
      cost: 750000,
      vendorName: "Rudi Hartono (Teknisi Internal)",
    },
    update: {
      assetId: "smkast03",
      description: "Penggantian LCD monitor PC TKT unit 3",
      startDate: new Date("2026-07-28"),
      status: "IN_PROGRESS",
      cost: 750000,
      vendorName: "Rudi Hartono (Teknisi Internal)",
    },
  });

  console.log("Seeding finished! Akun login (semua password: admin123):");
  console.log("  admin@smk.sch.id         → Super Admin");
  console.log("  staff.aset@smk.sch.id    → Staff Aset");
  console.log("  kajur.mplb@smk.sch.id    → MR (Ketua MPLB)");
  console.log("  kajur.tkt@smk.sch.id     → MR (Ketua TKT)");
  console.log("  kajur.akl@smk.sch.id     → MR (Ketua AKL)");
  console.log("  kajur.pht@smk.sch.id     → MR (Ketua PHT)");
  console.log("  teknisi@smk.sch.id       → Teknisi");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

-- Clear data
TRUNCATE TABLE "BastDetail", "Bast", "Maintenance", "Asset", "Location", "Category", "User", "Division" RESTART IDENTITY CASCADE;

-- 1. Divisions
INSERT INTO "Division" ("id", "code", "name", "description", "updatedAt") VALUES
('cm6xx12340001xyz5678div01', 'IT', 'Information Technology', 'IT Department', NOW()),
('cm6xx12340001xyz5678div02', 'HR', 'Human Resources', 'HR Department', NOW()),
('cm6xx12340001xyz5678div03', 'FIN', 'Finance', 'Finance Department', NOW());

-- 2. Users (Password: password123 -> $2a$12$GwFz/7... hash needed, using placeholder hash from bcryptjs default or just a known hash)
-- HASH for 'password123': $2a$12$RJ1./Zz4./././././././././././././././././././././ (Dummy hash, real app needs real hash)
-- Let's use a known hash for 'password123': $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4nc.M9NGLy
INSERT INTO "User" ("id", "email", "fullName", "password", "role", "nip", "divisionId", "updatedAt") VALUES
('cm6xx12340001xyz5678usr01', 'admin@eams.com', 'Super Admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4nc.M9NGLy', 'SUPER_ADMIN', 'ADM001', 'cm6xx12340001xyz5678div01', NOW()),
('cm6xx12340001xyz5678usr02', 'staff.it@eams.com', 'Budi Santoso', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4nc.M9NGLy', 'STAFF_ASSET', 'IT002', 'cm6xx12340001xyz5678div01', NOW()),
('cm6xx12340001xyz5678usr03', 'siti.hr@eams.com', 'Siti Aminah', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4nc.M9NGLy', 'EMPLOYEE', 'HR005', 'cm6xx12340001xyz5678div02', NOW());

-- 3. Categories
INSERT INTO "Category" ("id", "name") VALUES
('cm6xx12340001xyz5678cat01', 'Electronics'),
('cm6xx12340001xyz5678cat02', 'Furniture'),
('cm6xx12340001xyz5678cat03', 'Vehicles'),
('cm6xx12340001xyz5678cat04', 'Stationery');

-- 4. Locations
INSERT INTO "Location" ("id", "name", "address", "description", "updatedAt") VALUES
('cm6xx12340001xyz5678loc01', 'Head Office', 'Jl. Sudirman No. 1, Jakarta', 'Main HQ', NOW()),
('cm6xx12340001xyz5678loc02', 'Branch Bandung', 'Jl. Asia Afrika No. 10, Bandung', 'Bandung Branch', NOW()),
('cm6xx12340001xyz5678loc03', 'Warehouse', 'Kawasan Industri Cikarang', 'Main Warehouse', NOW());

-- 5. Assets
INSERT INTO "Asset" ("id", "name", "tagNumber", "categoryId", "locationId", "status", "condition", "purchaseDate", "purchasePrice", "description", "updatedAt") VALUES
('cm6xx12340001xyz5678ast01', 'MacBook Pro M3', 'AST-IT-001', 'cm6xx12340001xyz5678cat01', 'cm6xx12340001xyz5678loc01', 'AVAILABLE', 'GOOD', '2024-01-15', 25000000, 'Admin Laptop', NOW()),
('cm6xx12340001xyz5678ast02', 'Dell XPS 15', 'AST-IT-002', 'cm6xx12340001xyz5678cat01', 'cm6xx12340001xyz5678loc01', 'IN_USE', 'GOOD', '2023-11-20', 22000000, 'Dev Laptop', NOW()),
('cm6xx12340001xyz5678ast03', 'Herman Miller Chair', 'AST-FUR-001', 'cm6xx12340001xyz5678cat02', 'cm6xx12340001xyz5678loc01', 'AVAILABLE', 'GOOD', '2023-06-10', 15000000, 'Director Chair', NOW()),
('cm6xx12340001xyz5678ast04', 'Toyota Avanza', 'AST-VEH-001', 'cm6xx12340001xyz5678cat03', 'cm6xx12340001xyz5678loc03', 'AVAILABLE', 'GOOD', '2022-05-05', 250000000, 'Silver, Matic', NOW()),
('cm6xx12340001xyz5678ast05', 'Epson Projector', 'AST-ELE-005', 'cm6xx12340001xyz5678cat01', 'cm6xx12340001xyz5678loc02', 'IN_MAINTENANCE', 'MINOR_DAMAGE', '2021-08-15', 5000000, 'Meeting Room Projector', NOW());

-- update holder for asset in use
UPDATE "Asset" SET "holderId" = 'cm6xx12340001xyz5678usr02' WHERE "tagNumber" = 'AST-IT-002';

-- 6. BAST Assignment (Handover Laptop to Staff)
INSERT INTO "Bast" ("id", "bastNumber", "type", "status", "effectiveDate", "recipientName", "recipientPosition", "creatorId", "approverId", "approvedAt", "updatedAt") VALUES
('cm6xx12340001xyz5678bas01', 'BAST/2024/001', 'ASSIGNMENT', 'APPROVED', NOW(), 'Budi Santoso', 'IT Staff', 'cm6xx12340001xyz5678usr01', 'cm6xx12340001xyz5678usr01', NOW(), NOW());

INSERT INTO "BastDetail" ("id", "bastId", "assetId", "conditionBefore", "conditionAfter", "description") VALUES
('cm6xx12340001xyz5678dtl01', 'cm6xx12340001xyz5678bas01', 'cm6xx12340001xyz5678ast02', 'GOOD', 'GOOD', 'Handover laptop for development');

-- 7. Maintenance (Projector)
INSERT INTO "Maintenance" ("id", "assetId", "description", "startDate", "status", "cost", "vendorName", "updatedAt") VALUES
('cm6xx12340001xyz5678mnt01', 'cm6xx12340001xyz5678ast05', 'Lens cleaning and bulb replacement', NOW(), 'IN_PROGRESS', 500000, 'Epson Service Center', NOW());

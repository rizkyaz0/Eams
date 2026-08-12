/*
  Warnings:

  - You are about to drop the `ProcurementRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProcurementRequest" DROP CONSTRAINT "ProcurementRequest_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "ProcurementRequest" DROP CONSTRAINT "ProcurementRequest_maintenanceId_fkey";

-- DropForeignKey
ALTER TABLE "ProcurementRequest" DROP CONSTRAINT "ProcurementRequest_requestedById_fkey";

-- DropTable
DROP TABLE "ProcurementRequest";

-- DropEnum
DROP TYPE "ProcurementStatus";

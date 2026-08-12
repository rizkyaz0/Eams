/*
  Warnings:

  - You are about to drop the `AssetLoan` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LoanBatchStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "AssetLoan" DROP CONSTRAINT "AssetLoan_assetId_fkey";

-- DropForeignKey
ALTER TABLE "AssetLoan" DROP CONSTRAINT "AssetLoan_createdById_fkey";

-- DropTable
DROP TABLE "AssetLoan";

-- CreateTable
CREATE TABLE "AssetLoanBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "borrowerName" TEXT NOT NULL,
    "borrowerPosition" TEXT,
    "purpose" TEXT,
    "loanDate" TIMESTAMP(3) NOT NULL,
    "expectedReturnDate" TIMESTAMP(3),
    "notes" TEXT,
    "status" "LoanBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetLoanBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetLoanItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "actualReturnDate" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetLoanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetLoanBatch_batchNumber_key" ON "AssetLoanBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "AssetLoanBatch_status_idx" ON "AssetLoanBatch"("status");

-- CreateIndex
CREATE INDEX "AssetLoanItem_assetId_idx" ON "AssetLoanItem"("assetId");

-- CreateIndex
CREATE INDEX "AssetLoanItem_status_idx" ON "AssetLoanItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssetLoanItem_batchId_assetId_key" ON "AssetLoanItem"("batchId", "assetId");

-- AddForeignKey
ALTER TABLE "AssetLoanBatch" ADD CONSTRAINT "AssetLoanBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetLoanItem" ADD CONSTRAINT "AssetLoanItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AssetLoanBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetLoanItem" ADD CONSTRAINT "AssetLoanItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

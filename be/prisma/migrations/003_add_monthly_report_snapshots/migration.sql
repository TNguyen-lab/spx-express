-- Migration: 003_add_monthly_report_snapshots
-- Adds immutable monthly reporting snapshots derived from inventory movement history
-- Created: 2026-04-18

CREATE TABLE "MonthlyReportSnapshot" (
  "id" TEXT NOT NULL,
  "reportKey" TEXT NOT NULL,
  "reportType" TEXT NOT NULL DEFAULT 'MONTHLY_INVENTORY',
  "periodKey" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL,
  "warehouseLocationId" TEXT,
  "productId" TEXT,
  "category" TEXT,
  "closeRule" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "sourceMovementCount" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "generatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MonthlyReportSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthlyReportSnapshot_reportKey_key" ON "MonthlyReportSnapshot"("reportKey");
CREATE INDEX "MonthlyReportSnapshot_periodKey_idx" ON "MonthlyReportSnapshot"("periodKey");
CREATE INDEX "MonthlyReportSnapshot_sourceHash_idx" ON "MonthlyReportSnapshot"("sourceHash");
CREATE INDEX "MonthlyReportSnapshot_warehouseLocationId_idx" ON "MonthlyReportSnapshot"("warehouseLocationId");
CREATE INDEX "MonthlyReportSnapshot_productId_idx" ON "MonthlyReportSnapshot"("productId");

ALTER TABLE "MonthlyReportSnapshot" ADD CONSTRAINT "MonthlyReportSnapshot_warehouseLocationId_fkey"
  FOREIGN KEY ("warehouseLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MonthlyReportSnapshot" ADD CONSTRAINT "MonthlyReportSnapshot_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MonthlyReportSnapshot" ADD CONSTRAINT "MonthlyReportSnapshot_generatedById_fkey"
  FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

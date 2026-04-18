-- Migration: 002_add_outbox_and_movement
-- Adds outbox table for event-driven architecture and inventory_movement table for audit ledger
-- Created: 2026-04-18

CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

CREATE TYPE "MovementType" AS ENUM (
  'INBOUND', 'OUTBOUND', 'RESERVATION', 'RELEASE', 'ADJUSTMENT',
  'TRANSFER_IN', 'TRANSFER_OUT', 'DAMAGED', 'RETURNED'
);

CREATE TABLE "Outbox" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "lockedAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Outbox_status_idx" ON "Outbox"("status");
CREATE INDEX "Outbox_entity_idx" ON "Outbox"("entityType", "entityId");
CREATE INDEX "Outbox_created_idx" ON "Outbox"("createdAt");

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "movementType" "MovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "fromLocationId" TEXT,
  "toLocationId" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryMovement_product_idx" ON "InventoryMovement"("productId");
CREATE INDEX "InventoryMovement_reference_idx" ON "InventoryMovement"("referenceType", "referenceId");
CREATE INDEX "InventoryMovement_type_idx" ON "InventoryMovement"("movementType");
CREATE INDEX "InventoryMovement_created_idx" ON "InventoryMovement"("createdAt");

ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_fromLocationId_fkey"
  FOREIGN KEY ("fromLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_toLocationId_fkey"
  FOREIGN KEY ("toLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migration: 001_baseline_schema
-- Description: Capture current schema state with canonical status names
-- Created: 2026-04-18
-- This migration captures the baseline schema state after Task 1 canonical status freeze.
-- Prisma enums use PLAIN names (no P01-P07 prefixes) as frozen in canonical-status.ts.

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE "UserRole" AS ENUM (
  'ADMIN', 'QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'STAFF', 'DRIVER'
);

CREATE TYPE "PurchaseOrderStatus" AS ENUM (
  'DRAFT', 'PENDING_ACCOUNTING', 'PENDING_APPROVAL', 'APPROVED',
  'SENT_TO_SUPPLIER', 'SUPPLIER_CONFIRMED', 'SUPPLIER_REJECTED',
  'CANCELLED', 'COMPLETED'
);

CREATE TYPE "ApprovalRole" AS ENUM ('ACCOUNTING', 'WAREHOUSE_DIRECTOR');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE "InboundStatus" AS ENUM (
  'INBOUND_CREATED', 'ITEMS_RECEIVED', 'QUALITY_CHECKING', 'QC_PASSED',
  'QC_FAILED', 'BARCODE_CREATED', 'LOCATION_ASSIGNED', 'STAFF_RECEIVED',
  'NEW_PRODUCT_CREATED', 'INVENTORY_UPDATED', 'INBOUND_COMPLETED', 'INBOUND_CANCELLED'
);

CREATE TYPE "OutboundStatus" AS ENUM (
  'ORDER_RECEIVED', 'INVENTORY_CHECKED', 'INVENTORY_SUFFICIENT', 'INVENTORY_INSUFFICIENT',
  'PICKING_ASSIGNED', 'PICKER_ASSIGNED', 'ITEM_SCANNED', 'PICKED_CORRECT',
  'PICKED_WRONG', 'PUT_IN_CART', 'SLIP_PRINTED', 'MOVED_TO_PACKING'
);

CREATE TYPE "PackingStatus" AS ENUM (
  'PENDING', 'PACKING', 'PACKED', 'SEALED', 'ON_CONVEYOR', 'CANCELLED'
);

CREATE TYPE "SortingStatus" AS ENUM (
  'PENDING', 'SORTING', 'SORTED', 'COMPLETED'
);

CREATE TYPE "ShipmentStatus" AS ENUM (
  'CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY',
  'DELIVERED', 'FAILED', 'RETURNED'
);

CREATE TYPE "InventoryCheckType" AS ENUM ('ROUTINE', 'SPOT_CHECK', 'ANNUAL');
CREATE TYPE "InventoryCheckStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- ============================================================================
-- TABLES: User, Supplier
-- ============================================================================

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'STAFF',
  "phone" TEXT,
  "avatar" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- TABLES: Purchase Order
-- ============================================================================

CREATE TABLE "PurchaseOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "expectedDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseOrder_orderNumber_key" ON "PurchaseOrder"("orderNumber");

CREATE TABLE "PurchaseOrderItem" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "totalPrice" DOUBLE PRECISION NOT NULL,
  "receivedQty" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseOrderApproval" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "approverId" TEXT NOT NULL,
  "role" "ApprovalRole" NOT NULL,
  "status" "ApprovalStatus" NOT NULL,
  "notes" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrderApproval_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- TABLES: Inbound
-- ============================================================================

CREATE TABLE "Inbound" (
  "id" TEXT NOT NULL,
  "inboundNumber" TEXT NOT NULL,
  "purchaseOrderId" TEXT,
  "staffId" TEXT NOT NULL,
  "status" "InboundStatus" NOT NULL DEFAULT 'INBOUND_CREATED',
  "receivedDate" TIMESTAMP(3),
  "qcPassedDate" TIMESTAMP(3),
  "completedDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Inbound_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Inbound_inboundNumber_key" ON "Inbound"("inboundNumber");
CREATE UNIQUE INDEX "Inbound_purchaseOrderId_key" ON "Inbound"("purchaseOrderId");

CREATE TABLE "InboundItem" (
  "id" TEXT NOT NULL,
  "inboundId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "receivedQty" INTEGER NOT NULL DEFAULT 0,
  "damageQty" INTEGER NOT NULL DEFAULT 0,
  "barcode" TEXT,
  "locationId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InboundItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InboundItem_barcode_key" ON "InboundItem"("barcode");

-- ============================================================================
-- TABLES: Outbound
-- ============================================================================

CREATE TABLE "Outbound" (
  "id" TEXT NOT NULL,
  "outboundNumber" TEXT NOT NULL,
  "orderRef" TEXT,
  "status" "OutboundStatus" NOT NULL DEFAULT 'ORDER_RECEIVED',
  "pickerId" TEXT NOT NULL,
  "pickedDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Outbound_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Outbound_outboundNumber_key" ON "Outbound"("outboundNumber");
CREATE UNIQUE INDEX "Outbound_orderRef_key" ON "Outbound"("orderRef");

CREATE TABLE "OutboundItem" (
  "id" TEXT NOT NULL,
  "outboundId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "pickedQty" INTEGER NOT NULL DEFAULT 0,
  "locationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboundItem_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- TABLES: Packing
-- ============================================================================

CREATE TABLE "Packing" (
  "id" TEXT NOT NULL,
  "packingNumber" TEXT NOT NULL,
  "outboundId" TEXT NOT NULL,
  "packerId" TEXT NOT NULL,
  "status" "PackingStatus" NOT NULL DEFAULT 'PENDING',
  "packedDate" TIMESTAMP(3),
  "sealedDate" TIMESTAMP(3),
  "weight" DOUBLE PRECISION,
  "dimension" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Packing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Packing_packingNumber_key" ON "Packing"("packingNumber");
CREATE UNIQUE INDEX "Packing_outboundId_key" ON "Packing"("outboundId");

-- ============================================================================
-- TABLES: Sorting
-- ============================================================================

CREATE TABLE "Sorting" (
  "id" TEXT NOT NULL,
  "sortingNumber" TEXT NOT NULL,
  "packingId" TEXT NOT NULL,
  "sorterId" TEXT NOT NULL,
  "status" "SortingStatus" NOT NULL DEFAULT 'PENDING',
  "sortedDate" TIMESTAMP(3),
  "completedDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Sorting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Sorting_sortingNumber_key" ON "Sorting"("sortingNumber");
CREATE UNIQUE INDEX "Sorting_packingId_key" ON "Sorting"("packingId");

-- ============================================================================
-- TABLES: Shipment
-- ============================================================================

CREATE TABLE "Shipment" (
  "id" TEXT NOT NULL,
  "shipmentNumber" TEXT NOT NULL,
  "sortingId" TEXT NOT NULL,
  "shipperId" TEXT NOT NULL,
  "carrier" TEXT NOT NULL,
  "trackingNumber" TEXT,
  "status" "ShipmentStatus" NOT NULL DEFAULT 'CREATED',
  "shippedDate" TIMESTAMP(3),
  "deliveredDate" TIMESTAMP(3),
  "deliveryNotes" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Shipment_shipmentNumber_key" ON "Shipment"("shipmentNumber");
CREATE UNIQUE INDEX "Shipment_trackingNumber_key" ON "Shipment"("trackingNumber");
CREATE UNIQUE INDEX "Shipment_sortingId_key" ON "Shipment"("sortingId");

-- ============================================================================
-- TABLES: Inventory Check
-- ============================================================================

CREATE TABLE "InventoryCheck" (
  "id" TEXT NOT NULL,
  "checkNumber" TEXT NOT NULL,
  "checkerId" TEXT NOT NULL,
  "type" "InventoryCheckType" NOT NULL DEFAULT 'ROUTINE',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "status" "InventoryCheckStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryCheck_checkNumber_key" ON "InventoryCheck"("checkNumber");

CREATE TABLE "InventoryCheckItem" (
  "id" TEXT NOT NULL,
  "inventoryCheckId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "systemQty" INTEGER NOT NULL,
  "actualQty" INTEGER NOT NULL,
  "discrepancy" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryCheckItem_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- TABLES: Product & Inventory
-- ============================================================================

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'piece',
  "weight" DOUBLE PRECISION,
  "dimensions" TEXT,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "minStock" INTEGER NOT NULL DEFAULT 10,
  "image" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

CREATE TABLE "WarehouseLocation" (
  "id" TEXT NOT NULL,
  "zone" TEXT NOT NULL,
  "row" INTEGER NOT NULL,
  "shelf" INTEGER NOT NULL,
  "position" INTEGER,
  "capacity" INTEGER NOT NULL DEFAULT 100,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Inventory" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "available" INTEGER NOT NULL DEFAULT 0,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Inventory_productId_key" ON "Inventory"("productId");

-- ============================================================================
-- TABLES: Event Log (Legacy)
-- ============================================================================

CREATE TABLE "EventLog" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "process" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "userId" TEXT,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'SUCCESS',
  "errorMsg" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey"
  FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderApproval" ADD CONSTRAINT "PurchaseOrderApproval_purchaseOrderId_fkey"
  FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderApproval" ADD CONSTRAINT "PurchaseOrderApproval_approverId_fkey"
  FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Inbound" ADD CONSTRAINT "Inbound_purchaseOrderId_fkey"
  FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Inbound" ADD CONSTRAINT "Inbound_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InboundItem" ADD CONSTRAINT "InboundItem_inboundId_fkey"
  FOREIGN KEY ("inboundId") REFERENCES "Inbound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundItem" ADD CONSTRAINT "InboundItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InboundItem" ADD CONSTRAINT "InboundItem_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Outbound" ADD CONSTRAINT "Outbound_pickerId_fkey"
  FOREIGN KEY ("pickerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutboundItem" ADD CONSTRAINT "OutboundItem_outboundId_fkey"
  FOREIGN KEY ("outboundId") REFERENCES "Outbound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutboundItem" ADD CONSTRAINT "OutboundItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutboundItem" ADD CONSTRAINT "OutboundItem_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Packing" ADD CONSTRAINT "Packing_outboundId_fkey"
  FOREIGN KEY ("outboundId") REFERENCES "Outbound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Packing" ADD CONSTRAINT "Packing_packerId_fkey"
  FOREIGN KEY ("packerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sorting" ADD CONSTRAINT "Sorting_packingId_fkey"
  FOREIGN KEY ("packingId") REFERENCES "Packing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sorting" ADD CONSTRAINT "Sorting_sorterId_fkey"
  FOREIGN KEY ("sorterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_sortingId_fkey"
  FOREIGN KEY ("sortingId") REFERENCES "Sorting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_shipperId_fkey"
  FOREIGN KEY ("shipperId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_checkerId_fkey"
  FOREIGN KEY ("checkerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCheckItem" ADD CONSTRAINT "InventoryCheckItem_inventoryCheckId_fkey"
  FOREIGN KEY ("inventoryCheckId") REFERENCES "InventoryCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryCheckItem" ADD CONSTRAINT "InventoryCheckItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

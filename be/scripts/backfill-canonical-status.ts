import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATUS_MAPPINGS = {
  PurchaseOrder: {
    P01_PURCHASE_PLAN_CREATED: 'DRAFT',
    P01_PLAN_CONFIRMED_BY_ACCOUNTING: 'PENDING_ACCOUNTING',
    P01_PLAN_SENT_TO_DIRECTOR: 'PENDING_APPROVAL',
    P01_PLAN_APPROVED: 'APPROVED',
    P01_ORDER_SENT_TO_SUPPLIER: 'SENT_TO_SUPPLIER',
    P01_ORDER_CANCELLED: 'CANCELLED',
    P01_ORDER_COMPLETED: 'COMPLETED',
  },
  Inbound: {
    P02_INBOUND_CREATED: 'INBOUND_CREATED',
    P02_ITEMS_RECEIVED: 'ITEMS_RECEIVED',
    P02_QUALITY_CHECKING: 'QUALITY_CHECKING',
    P02_QC_PASSED: 'QC_PASSED',
    P02_QC_FAILED: 'QC_FAILED',
    P02_BARCODE_CREATED: 'BARCODE_CREATED',
    P02_LOCATION_ASSIGNED: 'LOCATION_ASSIGNED',
    P02_STAFF_RECEIVED: 'STAFF_RECEIVED',
    P02_NEW_PRODUCT_CREATED: 'NEW_PRODUCT_CREATED',
    P02_INVENTORY_UPDATED: 'INVENTORY_UPDATED',
    P02_INBOUND_COMPLETED: 'INBOUND_COMPLETED',
    P02_INBOUND_CANCELLED: 'INBOUND_CANCELLED',
  },
  Outbound: {
    P03_ORDER_RECEIVED: 'ORDER_RECEIVED',
    P03_INVENTORY_CHECKED: 'INVENTORY_CHECKED',
    P03_INVENTORY_SUFFICIENT: 'INVENTORY_SUFFICIENT',
    P03_INVENTORY_INSUFFICIENT: 'INVENTORY_INSUFFICIENT',
    P03_PICKING_ASSIGNED: 'PICKING_ASSIGNED',
    P03_PICKER_ASSIGNED: 'PICKER_ASSIGNED',
    P03_ITEM_SCANNED: 'ITEM_SCANNED',
    P03_PICKED_CORRECT: 'PICKED_CORRECT',
    P03_PICKED_WRONG: 'PICKED_WRONG',
    P03_PUT_IN_CART: 'PUT_IN_CART',
    P03_SLIP_PRINTED: 'SLIP_PRINTED',
    P03_MOVED_TO_PACKING: 'MOVED_TO_PACKING',
  },
  Packing: {
    P04_PACKING_RECEIVED: 'PENDING',
    P04_PACKING_STARTED: 'PACKING',
    P04_ITEM_PACKED: 'PACKED',
    P04_PACKING_SEALED: 'SEALED',
    P04_PACKING_ON_CONVEYOR: 'ON_CONVEYOR',
    P04_PACKING_CANCELLED: 'CANCELLED',
  },
  Sorting: {
    P05_SORTING_RECEIVED: 'PENDING',
    P05_SORTING_STARTED: 'SORTING',
    P05_ITEMS_SORTED: 'SORTED',
    P05_SORTING_COMPLETED: 'COMPLETED',
  },
  Shipment: {
    P06_SHIPMENT_CREATED: 'CREATED',
    P06_CARRIER_SELECTED: 'PICKED_UP',
    P06_IN_TRANSIT: 'IN_TRANSIT',
    P06_OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    P06_DELIVERED: 'DELIVERED',
    P06_DELIVERY_FAILED: 'FAILED',
    P06_RETURNED: 'RETURNED',
  },
  InventoryCheck: {
    P07_CHECK_SCHEDULE_CREATED: 'PENDING',
    P07_CHECK_STARTED: 'IN_PROGRESS',
    P07_CHECK_COMPLETED: 'COMPLETED',
  },
};

type EntityName = keyof typeof STATUS_MAPPINGS;
type OldStatus = string;
type NewStatus = string;

interface BackfillResult {
  entity: EntityName;
  oldStatus: OldStatus;
  newStatus: NewStatus;
  count: number;
}

async function backfillStatuses(): Promise<BackfillResult[]> {
  const results: BackfillResult[] = [];

  for (const [entity, statusMap] of Object.entries(STATUS_MAPPINGS)) {
    for (const [oldStatus, newStatus] of Object.entries(statusMap)) {
      const result = await (prisma as any)[entity.toLowerCase()].updateMany({
        where: { status: oldStatus },
        data: { status: newStatus },
      });

      if (result.count > 0) {
        results.push({
          entity: entity as EntityName,
          oldStatus,
          newStatus,
          count: result.count,
        });
      }
    }
  }

  return results;
}

async function main() {
  console.log('Starting status backfill...');
  console.log('This script maps old P01-P07 prefixed statuses to canonical plain names.\n');

  const results = await backfillStatuses();

  if (results.length === 0) {
    console.log('No records needed backfilling - all statuses already canonical.');
  } else {
    console.log('Backfill results:');
    for (const r of results) {
      console.log(`  ${r.entity}: ${r.oldStatus} -> ${r.newStatus} (${r.count} records)`);
    }
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('Backfill failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});

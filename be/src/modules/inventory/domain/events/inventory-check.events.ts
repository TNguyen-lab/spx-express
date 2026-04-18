export const InventoryCheckEvents = {
  Approved: 'INVENTORY_CHECK_APPROVED',
  RecountRequested: 'INVENTORY_CHECK_RECOUNT_REQUESTED',
  Completed: 'INVENTORY_CHECK_COMPLETED',
  PhysicalCountStarted: 'INVENTORY_CHECK_PHYSICAL_COUNT_STARTED',
} as const;

export type InventoryCheckEventName = typeof InventoryCheckEvents[keyof typeof InventoryCheckEvents];

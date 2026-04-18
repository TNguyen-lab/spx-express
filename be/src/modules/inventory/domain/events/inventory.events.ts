export const InventoryEvents = {
  CountSessionCreated: 'INVENTORY_COUNT_SESSION_CREATED',
  CountSubmitted: 'INVENTORY_COUNT_SUBMITTED',
  AdjustmentProcessed: 'INVENTORY_ADJUSTMENT_PROCESSED',
  MovementRecorded: 'INVENTORY_MOVEMENT_RECORDED',
  Reserved: 'INVENTORY_RESERVED',
  Released: 'INVENTORY_RELEASED',
} as const;

export type InventoryEventName = typeof InventoryEvents[keyof typeof InventoryEvents];

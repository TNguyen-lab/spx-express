export const InboundEvents = {
  Created: 'INBOUND_CREATED',
  Received: 'INBOUND_ITEMS_RECEIVED',
  QualityChecking: 'INBOUND_QUALITY_CHECKING',
  QCPassed: 'INBOUND_QC_PASSED',
  QCFailed: 'INBOUND_QC_FAILED',
  BarcodeCreated: 'INBOUND_BARCODE_CREATED',
  LocationAssigned: 'INBOUND_LOCATION_ASSIGNED',
  StaffReceived: 'INBOUND_STAFF_RECEIVED',
  NewProductCreated: 'INBOUND_NEW_PRODUCT_CREATED',
  InventoryUpdated: 'INBOUND_INVENTORY_UPDATED',
  Completed: 'INBOUND_COMPLETED',
  Cancelled: 'INBOUND_CANCELLED',
} as const;

export type InboundEventName = typeof InboundEvents[keyof typeof InboundEvents];

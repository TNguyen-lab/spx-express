export const PurchaseOrderStatus = {
  DRAFT: 'DRAFT',
  PENDING_ACCOUNTING: 'PENDING_ACCOUNTING',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  SENT_TO_SUPPLIER: 'SENT_TO_SUPPLIER',
  SUPPLIER_CONFIRMED: 'SUPPLIER_CONFIRMED',
  SUPPLIER_REJECTED: 'SUPPLIER_REJECTED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

export type PurchaseOrderStatus =
  (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export const InboundStatus = {
  INBOUND_CREATED: 'INBOUND_CREATED',
  ITEMS_RECEIVED: 'ITEMS_RECEIVED',
  QUALITY_CHECKING: 'QUALITY_CHECKING',
  QC_PASSED: 'QC_PASSED',
  QC_FAILED: 'QC_FAILED',
  BARCODE_CREATED: 'BARCODE_CREATED',
  LOCATION_ASSIGNED: 'LOCATION_ASSIGNED',
  STAFF_RECEIVED: 'STAFF_RECEIVED',
  NEW_PRODUCT_CREATED: 'NEW_PRODUCT_CREATED',
  INVENTORY_UPDATED: 'INVENTORY_UPDATED',
  INBOUND_COMPLETED: 'INBOUND_COMPLETED',
  INBOUND_CANCELLED: 'INBOUND_CANCELLED',
} as const;

export type InboundStatus = (typeof InboundStatus)[keyof typeof InboundStatus];

export const OutboundStatus = {
  ORDER_RECEIVED: 'ORDER_RECEIVED',
  INVENTORY_CHECKED: 'INVENTORY_CHECKED',
  INVENTORY_SUFFICIENT: 'INVENTORY_SUFFICIENT',
  INVENTORY_INSUFFICIENT: 'INVENTORY_INSUFFICIENT',
  PICKING_ASSIGNED: 'PICKING_ASSIGNED',
  PICKER_ASSIGNED: 'PICKER_ASSIGNED',
  ITEM_SCANNED: 'ITEM_SCANNED',
  PICKED_CORRECT: 'PICKED_CORRECT',
  PICKED_WRONG: 'PICKED_WRONG',
  PUT_IN_CART: 'PUT_IN_CART',
  SLIP_PRINTED: 'SLIP_PRINTED',
  MOVED_TO_PACKING: 'MOVED_TO_PACKING',
} as const;

export type OutboundStatus = (typeof OutboundStatus)[keyof typeof OutboundStatus];

export const PackingStatus = {
  PENDING: 'PENDING',
  PACKING: 'PACKING',
  PACKED: 'PACKED',
  SEALED: 'SEALED',
  ON_CONVEYOR: 'ON_CONVEYOR',
  CANCELLED: 'CANCELLED',
} as const;

export type PackingStatus = (typeof PackingStatus)[keyof typeof PackingStatus];

export const SortingStatus = {
  PENDING: 'PENDING',
  SORTING: 'SORTING',
  SORTED: 'SORTED',
  COMPLETED: 'COMPLETED',
} as const;

export type SortingStatus = (typeof SortingStatus)[keyof typeof SortingStatus];

export const ShippingStatus = {
  CREATED: 'CREATED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETURNED: 'RETURNED',
} as const;

export type ShippingStatus = (typeof ShippingStatus)[keyof typeof ShippingStatus];

export const InventoryCheckStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export type InventoryCheckStatus =
  (typeof InventoryCheckStatus)[keyof typeof InventoryCheckStatus];

export type WorkflowStatusCategory =
  | 'PURCHASE_ORDER'
  | 'INBOUND'
  | 'OUTBOUND'
  | 'PACKING'
  | 'SORTING'
  | 'SHIPPING'
  | 'INVENTORY_CHECK';

export const WorkflowStatus = {
  PurchaseOrder: PurchaseOrderStatus,
  Inbound: InboundStatus,
  Outbound: OutboundStatus,
  Packing: PackingStatus,
  Sorting: SortingStatus,
  Shipping: ShippingStatus,
  InventoryCheck: InventoryCheckStatus,
} as const;

export function getTerminalStatuses(): string[] {
  return [
    PurchaseOrderStatus.COMPLETED,
    PurchaseOrderStatus.CANCELLED,
    PurchaseOrderStatus.SUPPLIER_REJECTED,
    InboundStatus.INBOUND_COMPLETED,
    InboundStatus.INBOUND_CANCELLED,
    OutboundStatus.MOVED_TO_PACKING,
    PackingStatus.ON_CONVEYOR,
    SortingStatus.COMPLETED,
    ShippingStatus.DELIVERED,
    ShippingStatus.FAILED,
    ShippingStatus.RETURNED,
    InventoryCheckStatus.COMPLETED,
  ];
}

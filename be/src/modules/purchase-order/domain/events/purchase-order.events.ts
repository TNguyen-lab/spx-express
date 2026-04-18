export const PurchaseOrderEvents = {
  Created: 'ORDER_PURCHASE_PLAN_CREATED',
  SentToAccounting: 'ORDER_PLAN_SENT_TO_ACCOUNTING',
  ConfirmedByAccounting: 'ORDER_PLAN_CONFIRMED_BY_ACCOUNTING',
  Approved: 'ORDER_PLAN_APPROVED',
  Rejected: 'ORDER_PLAN_REJECTED',
  SentToSupplier: 'ORDER_SENT_TO_SUPPLIER',
  SupplierConfirmed: 'SUPPLIER_CONFIRMED',
  SupplierRejected: 'SUPPLIER_REJECTED',
  Completed: 'ORDER_COMPLETED',
  Cancelled: 'ORDER_CANCELLED',
  InboundCreated: 'INBOUND_CREATED',
} as const;

export type PurchaseOrderEventName = typeof PurchaseOrderEvents[keyof typeof PurchaseOrderEvents];

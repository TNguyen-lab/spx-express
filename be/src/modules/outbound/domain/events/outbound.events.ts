export const OutboundEvents = {
  Created: 'OUTBOUND_CREATED',
  OrderReceived: 'OUTBOUND_ORDER_RECEIVED',
  InventoryChecked: 'OUTBOUND_INVENTORY_CHECKED',
  InventorySufficient: 'OUTBOUND_INVENTORY_SUFFICIENT',
  InventoryInsufficient: 'OUTBOUND_INVENTORY_INSUFFICIENT',
  PickingAssigned: 'OUTBOUND_PICKING_ASSIGNED',
  PickerAssigned: 'OUTBOUND_PICKER_ASSIGNED',
  Scanned: 'OUTBOUND_SCANNED',
  ItemScanned: 'OUTBOUND_ITEM_SCANNED',
  PickedCorrect: 'OUTBOUND_PICKED_CORRECT',
  PickedWrong: 'OUTBOUND_PICKED_WRONG',
  Rescanned: 'OUTBOUND_RESCANNED',
  InCart: 'OUTBOUND_IN_CART',
  PutInCart: 'OUTBOUND_PUT_IN_CART',
  SlipPrinted: 'OUTBOUND_SLIP_PRINTED',
  MovedToPacking: 'OUTBOUND_MOVED_TO_PACKING',
} as const;

export type OutboundEventName = typeof OutboundEvents[keyof typeof OutboundEvents];

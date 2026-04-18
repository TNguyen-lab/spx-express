import { ShippingStatus } from '../../../../constants/canonical-status.js';

export type ShipmentStatus = typeof ShippingStatus[keyof typeof ShippingStatus];

export interface ShipmentState {
  id: string;
  shipmentNumber: string;
  sortingId: string;
  shipperId: string;
  carrier: string;
  status: ShipmentStatus;
  trackingNumber: string | null;
  notes: string | null;
  deliveryNotes: string | null;
  shippedDate: Date | null;
  deliveredDate: Date | null;
}

export function canTransitionShipment(currentStatus: ShipmentStatus, nextStatus: ShipmentStatus): boolean {
  const transitions: Record<ShipmentStatus, ShipmentStatus[]> = {
    [ShippingStatus.CREATED]: [ShippingStatus.PICKED_UP],
    [ShippingStatus.PICKED_UP]: [ShippingStatus.IN_TRANSIT],
    [ShippingStatus.IN_TRANSIT]: [ShippingStatus.OUT_FOR_DELIVERY, ShippingStatus.FAILED],
    [ShippingStatus.OUT_FOR_DELIVERY]: [ShippingStatus.DELIVERED, ShippingStatus.FAILED],
    [ShippingStatus.DELIVERED]: [],
    [ShippingStatus.FAILED]: [ShippingStatus.RETURNED, ShippingStatus.IN_TRANSIT],
    [ShippingStatus.RETURNED]: [],
  };

  return transitions[currentStatus]?.includes(nextStatus) ?? false;
}

export const ShippingEvents = {
  ShipmentCreated: 'SHIPMENT_CREATED',
  CarrierSelected: 'CARRIER_SELECTED',
  TrackingCreated: 'TRACKING_CREATED',
  ShipmentPickedUp: 'SHIPMENT_PICKED_UP',
  ShipmentInTransit: 'SHIPMENT_IN_TRANSIT',
  ShipmentOutForDelivery: 'SHIPMENT_OUT_FOR_DELIVERY',
  ShipmentDelivered: 'SHIPMENT_DELIVERED',
  ShipmentFailed: 'SHIPMENT_FAILED',
  ReturnInitiated: 'RETURN_INITIATED',
} as const;

export type ShippingEventName = typeof ShippingEvents[keyof typeof ShippingEvents];

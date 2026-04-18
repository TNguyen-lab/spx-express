export function serializeShipment<T>(shipment: T) {
  return { shipment };
}

export function serializeShipments<T>(shipments: T[], total: number, page: number, limit: number) {
  return { shipments, total, page, limit };
}

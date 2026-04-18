export function serializePurchaseOrder<T>(purchaseOrder: T) {
  return {
    order: purchaseOrder,
  };
}

export function serializePurchaseOrders<T>(orders: T[], total: number, page: number, limit: number) {
  return {
    orders,
    total,
    page,
    limit,
  };
}

export function serializeInventory<T>(inventory: T) {
  return { inventory };
}

export function serializeInventoryList<T>(inventory: T[]) {
  return { inventory };
}

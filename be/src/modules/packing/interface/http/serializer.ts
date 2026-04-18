export function serializePacking<T>(packing: T) {
  return { packing };
}

export function serializePackings<T>(packings: T[], total: number, page: number, limit: number) {
  return { packings, total, page, limit };
}

export function serializeSupplier<T>(supplier: T) {
  return { supplier };
}

export function serializeSuppliers<T>(suppliers: T[]) {
  return { suppliers };
}

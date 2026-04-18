export function serializeProduct<T>(product: T) {
  return { product };
}

export function serializeProducts<T>(products: T[], total: number, page: number, limit: number) {
  return { products, total, page, limit };
}

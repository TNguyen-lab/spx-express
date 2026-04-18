export function serializeOutbound<T>(outbound: T) {
  return { outbound };
}

export function serializeOutbounds<T>(outbounds: T[], total: number, page: number, limit: number) {
  return { outbounds, total, page, limit };
}

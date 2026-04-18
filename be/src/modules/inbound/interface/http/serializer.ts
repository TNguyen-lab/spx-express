export function serializeInbound<T>(inbound: T) {
  return { inbound };
}

export function serializeInbounds<T>(inbounds: T[], total: number, page: number, limit: number) {
  return { inbounds, total, page, limit };
}

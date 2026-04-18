export function serializeListResponse<T>(key: string, items: T[], total: number, page?: number, limit?: number) {
  return {
    [key]: items,
    total,
    ...(page === undefined ? {} : { page }),
    ...(limit === undefined ? {} : { limit }),
  } as Record<string, unknown>;
}

export function serializeEntityResponse<T>(key: string, entity: T) {
  return { [key]: entity } as Record<string, T>;
}

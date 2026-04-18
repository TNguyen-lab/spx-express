export function serializeLocation<T>(location: T) {
  return { location };
}

export function serializeLocations<T>(locations: T[]) {
  return { locations };
}

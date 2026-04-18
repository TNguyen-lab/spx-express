export const PackingEvents = {
  Started: 'PACKING_STARTED',
  ItemPacked: 'PACKING_ITEM_PACKED',
  Packed: 'PACKING_PACKED',
  Sealed: 'PACKING_SEALED',
  Completed: 'PACKING_COMPLETED',
  Cancelled: 'PACKING_CANCELLED',
  GroupingUpdated: 'PACKING_GROUPING_UPDATED',
  OnConveyor: 'PACKING_ON_CONVEYOR',
} as const;

export type PackingEventName = typeof PackingEvents[keyof typeof PackingEvents];

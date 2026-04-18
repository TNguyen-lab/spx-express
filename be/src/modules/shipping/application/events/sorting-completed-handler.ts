import { subscriberRegistry } from '../../../../events/subscribers.js';
import { SortingEvents } from '../../../sorting/domain/events/sorting.events.js';
import { createShipment } from '../commands/create-shipment.js';

export async function handleSortingCompleted(input: {
  sortingId: string;
  shipperId: string;
  carrier?: string;
  userId: string;
}) {
  return createShipment({
    sortingId: input.sortingId,
    shipperId: input.shipperId,
    carrier: input.carrier,
    userId: input.userId,
  });
}

export function registerSortingCompletedHandler(): void {
  subscriberRegistry.subscribe(SortingEvents.Completed, async (payload) => {
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const sortingId = String(payload.entityId || data.sortingId || '');
    const shipperId = String(payload.userId || '');
    const carrier = data.carrier ? String(data.carrier) : undefined;

    if (!sortingId || !shipperId) {
      throw new Error('Missing sorting completed payload');
    }

    await createShipment({
      sortingId,
      shipperId,
      carrier,
      userId: shipperId,
    });
  }, 'Create shipment when sorting completes');
}

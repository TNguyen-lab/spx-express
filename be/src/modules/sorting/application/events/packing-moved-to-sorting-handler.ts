import { PackingEvents } from '../../../packing/domain/events/packing.events.js';
import { subscriberRegistry } from '../../../../events/subscribers.js';
import { startSorting } from '../commands/start-sorting.js';

export function registerPackingMovedToSortingHandler(): void {
  subscriberRegistry.subscribe(PackingEvents.Completed, async (payload) => {
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const sortingId = String(data.sortingId || '');
    const sorterId = String(payload.userId || '');

    if (!sortingId || !sorterId) {
      throw new Error('Missing sorting handoff payload');
    }

    await startSorting({ sortingId, sorterId });
  }, 'Start sorting when packing completes');
}

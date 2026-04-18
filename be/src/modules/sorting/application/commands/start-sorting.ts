import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { SortingStatus } from '../../../../constants/canonical-status.js';
import { SortingEvents } from '../../domain/events/sorting.events.js';

export async function startSorting(input: { sortingId: string; sorterId: string }) {
  const sorting = await prisma.sorting.findUnique({
    where: { id: input.sortingId },
  });

  if (!sorting) {
    throw new Error('Sorting not found');
  }

  if (sorting.status !== SortingStatus.PENDING) {
    throw new Error('Sorting not in PENDING status');
  }

  const updated = await prisma.sorting.update({
    where: { id: input.sortingId },
    data: { status: SortingStatus.SORTING },
  });

  await publishEvent(SortingEvents.Started, 'Sorting', sorting.id, {
    sortingNumber: sorting.sortingNumber,
    sorterId: input.sorterId,
  }, input.sorterId);

  return updated;
}

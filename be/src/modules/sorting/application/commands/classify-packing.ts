import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { SortingStatus } from '../../../../constants/canonical-status.js';
import { SortingEvents } from '../../domain/events/sorting.events.js';

export async function classifyPacking(input: { sortingId: string; sizeCategory?: string; zone?: string; notes?: string; staffId: string }) {
  const sorting = await prisma.sorting.findUnique({ where: { id: input.sortingId } });
  if (!sorting) throw new Error('Sorting not found');
  if (sorting.status !== SortingStatus.SORTING) throw new Error('Sorting not in SORTING status');

  const updated = await prisma.sorting.update({
    where: { id: input.sortingId },
    data: { status: SortingStatus.SORTED, notes: input.notes || sorting.notes },
  });

  await publishEvent(SortingEvents.Classified, 'Sorting', sorting.id, {
    sortingNumber: sorting.sortingNumber,
    sizeCategory: input.sizeCategory,
    zone: input.zone,
  }, input.staffId);

  return updated;
}

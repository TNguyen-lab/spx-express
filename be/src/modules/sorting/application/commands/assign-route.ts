import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { SortingEvents } from '../../domain/events/sorting.events.js';

export async function assignRoute(input: { sortingId: string; route: string; notes?: string; staffId: string }) {
  const sorting = await prisma.sorting.findUnique({ where: { id: input.sortingId } });
  if (!sorting) throw new Error('Sorting not found');

  const updated = await prisma.sorting.update({
    where: { id: input.sortingId },
    data: { notes: input.notes || sorting.notes },
  });

  await publishEvent(SortingEvents.AssignedRoute, 'Sorting', sorting.id, {
    sortingNumber: sorting.sortingNumber,
    route: input.route,
  }, input.staffId);

  return { sorting: updated, route: input.route };
}

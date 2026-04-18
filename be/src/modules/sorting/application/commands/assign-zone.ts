import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { SortingEvents } from '../../domain/events/sorting.events.js';

export async function assignZone(input: { sortingId: string; zone: string; notes?: string; staffId: string }) {
  const sorting = await prisma.sorting.findUnique({ where: { id: input.sortingId } });
  if (!sorting) throw new Error('Sorting not found');

  const updatedNotes = input.notes
    ? `${sorting.notes || ''}\nZone: ${input.zone} - ${input.notes}`.trim()
    : `${sorting.notes || ''}\nZone: ${input.zone}`.trim();

  const updated = await prisma.sorting.update({
    where: { id: input.sortingId },
    data: { notes: updatedNotes },
  });

  await publishEvent(SortingEvents.AssignedZone, 'Sorting', sorting.id, {
    sortingNumber: sorting.sortingNumber,
    zone: input.zone,
  }, input.staffId);

  return { sorting: updated, zone: input.zone };
}

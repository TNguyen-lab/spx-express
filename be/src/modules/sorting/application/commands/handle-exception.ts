import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { SortingEvents } from '../../domain/events/sorting.events.js';

export async function handleException(input: { sortingId: string; exceptionType: 'REPACK' | 'DAMAGED' | 'MISSING_LABEL' | 'WRONG_ADDRESS' | 'OTHER'; notes?: string; staffId: string }) {
  const sorting = await prisma.sorting.findUnique({ where: { id: input.sortingId } });
  if (!sorting) throw new Error('Sorting not found');

  await publishEvent(SortingEvents.ExceptionHandled, 'Sorting', sorting.id, {
    sortingNumber: sorting.sortingNumber,
    exceptionType: input.exceptionType,
    notes: input.notes,
  }, input.staffId);

  if (input.exceptionType === 'REPACK') {
    await prisma.packing.update({ where: { id: sorting.packingId }, data: { status: 'PENDING' } });
  }

  return { message: 'Exception recorded', exceptionType: input.exceptionType };
}

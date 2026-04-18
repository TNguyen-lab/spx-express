import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { SortingStatus } from '../../../../constants/canonical-status.js';
import { SortingEvents } from '../../domain/events/sorting.events.js';

export async function qcCheck(input: { sortingId: string; passed: boolean; notes?: string; staffId: string }) {
  const sorting = await prisma.sorting.findUnique({ where: { id: input.sortingId } });
  if (!sorting) throw new Error('Sorting not found');
  if (!['PENDING', 'SORTING', 'SORTED'].includes(sorting.status)) {
    throw new Error('Sorting not in valid status for QC check');
  }

  await publishEvent(SortingEvents.QcChecked, 'Sorting', sorting.id, {
    sortingNumber: sorting.sortingNumber,
    passed: input.passed,
    notes: input.notes,
  }, input.staffId);

  if (!input.passed) {
    await prisma.packing.update({ where: { id: sorting.packingId }, data: { status: 'PENDING' } });
  }

  return { message: input.passed ? 'QC passed' : 'Returned to packing', passed: input.passed };
}

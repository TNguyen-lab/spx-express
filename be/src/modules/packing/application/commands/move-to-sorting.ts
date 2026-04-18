import type { Prisma } from '@prisma/client';
import { PackingStatus } from '../../../../constants/canonical-status.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import type { EventType } from '../../../../events/types.js';
import { PackingEvents } from '../../domain/events/packing.events.js';
import { generateSortingNumber, getPackingOrThrow } from './_helpers.js';

export async function moveToSorting(
  tx: Prisma.TransactionClient,
  input: { packingId: string; staffId: string },
) {
  const packing = await getPackingOrThrow(input.packingId);

  if (packing.status !== PackingStatus.ON_CONVEYOR) {
    throw new Error('Packing not on conveyor');
  }

  const sortingNumber = generateSortingNumber();
  const sorting = await tx.sorting.create({
    data: {
      sortingNumber,
      packingId: packing.id,
      sorterId: input.staffId,
      status: 'PENDING',
    },
    include: {
      packing: {
        include: {
          outbound: { include: { items: { include: { product: true } } } },
        },
      },
      sorter: { select: { id: true, name: true } },
    },
  });

  await publishEvent(PackingEvents.Completed as EventType, 'Packing', packing.id, {
    packingNumber: packing.packingNumber,
    sortingNumber: sorting.sortingNumber,
  }, input.staffId);

  return sorting;
}

import type { Prisma } from '@prisma/client';
import { PackingStatus } from '../../../../constants/canonical-status.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { PackingEvents } from '../../domain/events/packing.events.js';
import { getPackingOrThrow } from './_helpers.js';

export async function startPacking(tx: Prisma.TransactionClient, input: { packingId: string; packerId: string }) {
  const packing = await getPackingOrThrow(input.packingId);

  if (packing.status !== PackingStatus.PENDING) {
    throw new Error('Packing not in PENDING status');
  }

  if (packing.packerId !== input.packerId) {
    throw new Error('Packer not assigned to this packing');
  }

  const updated = await tx.packing.update({
    where: { id: input.packingId },
    data: { status: PackingStatus.PACKING },
  });

  await publishEvent(PackingEvents.Started, 'Packing', packing.id, {
    packingNumber: packing.packingNumber,
    packerId: input.packerId,
  }, input.packerId);

  return updated;
}

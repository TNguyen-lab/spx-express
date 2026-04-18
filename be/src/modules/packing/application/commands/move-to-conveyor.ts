import type { Prisma } from '@prisma/client';
import { PackingStatus } from '../../../../constants/canonical-status.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { PackingEvents } from '../../domain/events/packing.events.js';
import { getPackingOrThrow } from './_helpers.js';

export async function moveToConveyor(
  tx: Prisma.TransactionClient,
  input: { packingId: string; staffId: string },
) {
  const packing = await getPackingOrThrow(input.packingId);

  if (packing.status !== PackingStatus.SEALED) {
    throw new Error('Packing not in SEALED status');
  }

  const updated = await tx.packing.update({
    where: { id: input.packingId },
    data: { status: PackingStatus.ON_CONVEYOR },
  });

  await publishEvent(PackingEvents.OnConveyor, 'Packing', packing.id, {
    packingNumber: packing.packingNumber,
  }, input.staffId);

  return updated;
}

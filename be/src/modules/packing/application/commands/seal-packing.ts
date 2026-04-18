import type { Prisma } from '@prisma/client';
import { PackingStatus } from '../../../../constants/canonical-status.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { PackingEvents } from '../../domain/events/packing.events.js';
import { getPackingOrThrow } from './_helpers.js';

export async function sealPacking(
  tx: Prisma.TransactionClient,
  input: { packingId: string; weight?: number; dimension?: string; packerId: string },
) {
  const packing = await getPackingOrThrow(input.packingId);

  if (packing.status !== PackingStatus.PACKED) {
    throw new Error('Packing not in PACKED status');
  }

  const updated = await tx.packing.update({
    where: { id: input.packingId },
    data: {
      status: PackingStatus.SEALED,
      sealedDate: new Date(),
      weight: input.weight ?? null,
      dimension: input.dimension ?? null,
    },
  });

  await publishEvent(PackingEvents.Sealed, 'Packing', packing.id, {
    packingNumber: packing.packingNumber,
    weight: input.weight,
    dimension: input.dimension,
  }, input.packerId);

  return updated;
}

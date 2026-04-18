import type { Prisma } from '@prisma/client';
import { PackingStatus } from '../../../../constants/canonical-status.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { PackingEvents } from '../../domain/events/packing.events.js';
import { getPackingOrThrow } from './_helpers.js';

export async function recordItemPacked(
  tx: Prisma.TransactionClient,
  input: { packingId: string; itemId: string; packedQty: number; packerId: string },
) {
  const packing = await getPackingOrThrow(input.packingId);

  if (packing.status !== PackingStatus.PACKING) {
    throw new Error('Packing not in PACKING status');
  }

  const updated = await tx.packing.update({
    where: { id: input.packingId },
    data: { itemsPacked: { increment: input.packedQty } },
  });

  await publishEvent(PackingEvents.ItemPacked, 'Packing', packing.id, {
    packingNumber: packing.packingNumber,
    itemId: input.itemId,
    packedQty: input.packedQty,
  }, input.packerId);

  return updated;
}

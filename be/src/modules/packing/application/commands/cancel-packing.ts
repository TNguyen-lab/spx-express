import type { Prisma } from '@prisma/client';
import { PackingStatus } from '../../../../constants/canonical-status.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { PackingEvents } from '../../domain/events/packing.events.js';
import { getPackingOrThrow } from './_helpers.js';

export async function cancelPacking(
  tx: Prisma.TransactionClient,
  input: { packingId: string; reason?: string; staffId: string },
) {
  const packing = await getPackingOrThrow(input.packingId);

  if ([PackingStatus.SEALED, PackingStatus.ON_CONVEYOR, PackingStatus.CANCELLED].includes(packing.status as never)) {
    throw new Error('Packing cannot be cancelled in current status');
  }

  const updated = await tx.packing.update({
    where: { id: input.packingId },
    data: {
      status: PackingStatus.CANCELLED,
      notes: input.reason
        ? `${packing.notes || ''}\nCancelled: ${input.reason}`.trim()
        : packing.notes,
    },
  });

  await publishEvent(PackingEvents.Cancelled, 'Packing', packing.id, {
    packingNumber: packing.packingNumber,
    reason: input.reason,
  }, input.staffId);

  return updated;
}

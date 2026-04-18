import type { Prisma } from '@prisma/client';
import { PackingStatus } from '../../../../constants/canonical-status.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { PackingEvents } from '../../domain/events/packing.events.js';
import { getPackingOrThrow } from './_helpers.js';

export async function markPacked(
  tx: Prisma.TransactionClient,
  input: { packingId: string; cartonId?: string; palletId?: string; notes?: string; packerId: string },
) {
  const packing = await getPackingOrThrow(input.packingId);

  if (packing.status !== PackingStatus.PACKING) {
    throw new Error('Packing not in PACKING status');
  }

  const groupingInfo = input.cartonId || input.palletId
    ? `Carton: ${input.cartonId || 'N/A'}, Pallet: ${input.palletId || 'N/A'}`
    : '';
  const updatedNotes = input.notes
    ? `${packing.notes || ''}\n${groupingInfo}\n${input.notes}`.trim()
    : `${packing.notes || ''}\n${groupingInfo}`.trim();

  const updated = await tx.packing.update({
    where: { id: input.packingId },
    data: {
      status: PackingStatus.PACKED,
      notes: updatedNotes || packing.notes,
      cartonId: input.cartonId || packing.cartonId,
      palletId: input.palletId || packing.palletId,
    },
  });

  await publishEvent(PackingEvents.Packed, 'Packing', packing.id, {
    packingNumber: packing.packingNumber,
    cartonId: input.cartonId,
    palletId: input.palletId,
  }, input.packerId);

  return updated;
}

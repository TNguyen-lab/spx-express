import type { Prisma } from '@prisma/client';
import { PackingStatus } from '../../../../constants/canonical-status.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { PackingEvents } from '../../domain/events/packing.events.js';
import { getPackingOrThrow } from './_helpers.js';

export async function updateGrouping(
  tx: Prisma.TransactionClient,
  input: { packingId: string; cartonId?: string; palletId?: string; notes?: string; staffId: string },
) {
  const packing = await getPackingOrThrow(input.packingId);

  if (![PackingStatus.PACKING, PackingStatus.PACKED].includes(packing.status as never)) {
    throw new Error('Packing not in valid status for grouping update');
  }

  const groupingInfo = `Grouping - Carton: ${input.cartonId || 'N/A'}, Pallet: ${input.palletId || 'N/A'}`;
  const updatedNotes = input.notes
    ? `${packing.notes || ''}\n${groupingInfo}\n${input.notes}`.trim()
    : `${packing.notes || ''}\n${groupingInfo}`.trim();

  const updated = await tx.packing.update({
    where: { id: input.packingId },
    data: {
      notes: updatedNotes,
      cartonId: input.cartonId || packing.cartonId,
      palletId: input.palletId || packing.palletId,
    },
  });

  await publishEvent(PackingEvents.GroupingUpdated, 'Packing', packing.id, {
    packingNumber: packing.packingNumber,
    cartonId: input.cartonId,
    palletId: input.palletId,
  }, input.staffId);

  return updated;
}

import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { OutboundStatus } from '../../../../constants/canonical-status.js';
import { OutboundEvents } from '../../domain/events/outbound.events.js';
import { getOutboundOrThrow, validateTransition } from './_shared.js';

export async function confirmPickedCorrect(id: string, itemId: string, pickedQty: number, role: string, userId: string) {
  const outbound = await getOutboundOrThrow(id);
  validateTransition(outbound.status as never, OutboundStatus.PICKED_CORRECT as never, role);

  await prisma.outboundItem.update({
    where: { id: itemId },
    data: { pickedQty },
  });

  const updated = await prisma.outbound.update({
    where: { id },
    data: { status: 'PICKED_CORRECT' },
  });

  await publishEvent(OutboundEvents.PickedCorrect, 'Outbound', outbound.id, {
    outboundNumber: outbound.outboundNumber,
    itemId,
    pickedQty,
  }, userId);

  return updated;
}

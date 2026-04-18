import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { OutboundStatus } from '../../../../constants/canonical-status.js';
import { OutboundEvents } from '../../domain/events/outbound.events.js';
import { getOutboundOrThrow, validateTransition } from './_shared.js';

export async function markPickedWrong(id: string, itemId: string, role: string, userId: string) {
  const outbound = await getOutboundOrThrow(id);
  validateTransition(outbound.status as never, OutboundStatus.PICKED_WRONG as never, role);

  const updated = await prisma.outbound.update({
    where: { id },
    data: { status: 'PICKED_WRONG' },
  });

  const payload = {
    outboundNumber: outbound.outboundNumber,
    itemId,
    message: 'Item picked incorrectly, please rescan',
  };

  await publishEvent(OutboundEvents.PickedWrong, 'Outbound', outbound.id, payload, userId);

  return updated;
}

import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { OutboundStatus } from '../../../../constants/canonical-status.js';
import { OutboundEvents } from '../../domain/events/outbound.events.js';
import { getOutboundOrThrow, validateTransition } from './_shared.js';

export async function putInCart(id: string, role: string, userId: string) {
  const outbound = await getOutboundOrThrow(id);
  validateTransition(outbound.status as never, OutboundStatus.PUT_IN_CART as never, role);

  const updated = await prisma.outbound.update({
    where: { id },
    data: { status: 'PUT_IN_CART' },
  });

  const payload = { outboundNumber: outbound.outboundNumber };
  await publishEvent(OutboundEvents.InCart, 'Outbound', outbound.id, payload, userId);
  await publishEvent(OutboundEvents.PutInCart, 'Outbound', outbound.id, payload, userId);

  return updated;
}

import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { OutboundStatus } from '../../../../constants/canonical-status.js';
import { OutboundEvents } from '../../domain/events/outbound.events.js';
import { getOutboundOrThrow, validateTransition } from './_shared.js';

export async function printSlip(id: string, role: string, userId: string) {
  const outbound = await getOutboundOrThrow(id);
  validateTransition(outbound.status as never, OutboundStatus.SLIP_PRINTED as never, role);

  const updated = await prisma.outbound.update({
    where: { id },
    data: { status: 'SLIP_PRINTED' },
  });

  await publishEvent(OutboundEvents.SlipPrinted, 'Outbound', outbound.id, {
    outboundNumber: outbound.outboundNumber,
  }, userId);

  return updated;
}

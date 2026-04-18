import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { OutboundStatus } from '../../../../constants/canonical-status.js';
import { OutboundEvents } from '../../domain/events/outbound.events.js';
import { getOutboundOrThrow, validateTransition } from './_shared.js';

export async function rescanItem(id: string, role: string, userId: string) {
  const outbound = await getOutboundOrThrow(id);
  validateTransition(outbound.status as never, OutboundStatus.ITEM_SCANNED as never, role);

  const updated = await prisma.outbound.update({
    where: { id },
    data: { status: 'ITEM_SCANNED' },
  });

  const payload = { outboundNumber: outbound.outboundNumber, rescan: true };
  await publishEvent(OutboundEvents.Rescanned, 'Outbound', outbound.id, payload, userId);
  await publishEvent(OutboundEvents.ItemScanned, 'Outbound', outbound.id, payload, userId);

  return updated;
}

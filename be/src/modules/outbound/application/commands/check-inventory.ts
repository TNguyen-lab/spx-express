import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { OutboundStatus } from '../../../../constants/canonical-status.js';
import { OutboundEvents } from '../../domain/events/outbound.events.js';
import { getOutboundOrThrow, validateTransition } from './_shared.js';

export async function checkInventory(id: string, role: string, userId: string) {
  const outbound = await getOutboundOrThrow(id);
  validateTransition(outbound.status as never, OutboundStatus.INVENTORY_CHECKED as never, role);

  const updated = await prisma.outbound.update({
    where: { id },
    data: { status: 'INVENTORY_CHECKED' },
  });

  await publishEvent(OutboundEvents.InventoryChecked, 'Outbound', outbound.id, {
    outboundNumber: outbound.outboundNumber,
  }, userId);

  return updated;
}

export async function recheckInventory(id: string, role: string, userId: string) {
  const outbound = await getOutboundOrThrow(id);
  validateTransition(outbound.status as never, OutboundStatus.INVENTORY_CHECKED as never, role);

  const updated = await prisma.outbound.update({
    where: { id },
    data: { status: 'INVENTORY_CHECKED' },
  });

  await publishEvent(OutboundEvents.InventoryChecked, 'Outbound', outbound.id, {
    outboundNumber: outbound.outboundNumber,
    recheck: true,
  }, userId);

  return updated;
}

import { withTransaction } from '../../../../modules/shared/transactions.js';
import { publishEventWithTx } from '../../../../shared/events/application-event-publisher.js';
import { InboundEvents } from '../../domain/events/inbound.events.js';
import { validateTransition, type InboundRole } from '../../domain/aggregates/inbound-policy.js';
import { InboundStatus } from '../../../../constants/canonical-status.js';
import { getInboundOrThrow } from './_helpers.js';

export async function assignLocation(id: string, role: InboundRole, userId: string, itemId: string, locationId: string) {
  return withTransaction(async (tx) => {
    const inbound = await getInboundOrThrow(id, tx);
    validateTransition(inbound.status as never, InboundStatus.LOCATION_ASSIGNED as never, role);
    await tx.inboundItem.update({ where: { id: itemId }, data: { locationId } });
    const updated = await tx.inbound.update({ where: { id }, data: { status: 'LOCATION_ASSIGNED' } });
    await publishEventWithTx(tx, InboundEvents.LocationAssigned, 'Inbound', inbound.id, { inboundNumber: inbound.inboundNumber, locationId, itemId }, userId);
    return updated;
  });
}

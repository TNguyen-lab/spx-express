import { withTransaction } from '../../../../modules/shared/transactions.js';
import { publishEventWithTx } from '../../../../shared/events/application-event-publisher.js';
import { InboundEvents } from '../../domain/events/inbound.events.js';
import { validateTransition, type InboundRole } from '../../domain/aggregates/inbound-policy.js';
import { InboundStatus } from '../../../../constants/canonical-status.js';
import { getInboundOrThrow } from './_helpers.js';

export async function confirmReceipt(id: string, role: InboundRole, userId: string) {
  return withTransaction(async (tx) => {
    const inbound = await getInboundOrThrow(id, tx);
    validateTransition(inbound.status as never, InboundStatus.STAFF_RECEIVED as never, role);
    const updated = await tx.inbound.update({ where: { id }, data: { status: 'STAFF_RECEIVED' } });
    await publishEventWithTx(tx, InboundEvents.StaffReceived, 'Inbound', inbound.id, { inboundNumber: inbound.inboundNumber }, userId);
    return updated;
  });
}

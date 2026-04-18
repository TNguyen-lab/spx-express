import { withTransaction } from '../../../../modules/shared/transactions.js';
import { publishEventWithTx } from '../../../../shared/events/application-event-publisher.js';
import { InboundEvents } from '../../domain/events/inbound.events.js';
import { validateTransition, type InboundRole } from '../../domain/aggregates/inbound-policy.js';
import { InboundStatus } from '../../../../constants/canonical-status.js';
import { getInboundOrThrow } from './_helpers.js';

export async function failQC(id: string, role: InboundRole, userId: string, reason?: string) {
  return withTransaction(async (tx) => {
    const inbound = await getInboundOrThrow(id, tx);
    validateTransition(inbound.status as never, InboundStatus.QC_FAILED as never, role);
    const updated = await tx.inbound.update({ where: { id }, data: { status: 'QC_FAILED', notes: reason || inbound.notes } });
    await publishEventWithTx(tx, InboundEvents.QCFailed, 'Inbound', inbound.id, { inboundNumber: inbound.inboundNumber, reason }, userId);
    return updated;
  });
}

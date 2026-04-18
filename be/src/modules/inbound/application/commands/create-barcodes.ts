import { withTransaction } from '../../../../modules/shared/transactions.js';
import { publishEventWithTx } from '../../../../shared/events/application-event-publisher.js';
import { InboundEvents } from '../../domain/events/inbound.events.js';
import { validateTransition, type InboundRole } from '../../domain/aggregates/inbound-policy.js';
import { InboundStatus } from '../../../../constants/canonical-status.js';
import { getInboundOrThrow } from './_helpers.js';

export async function createBarcodes(id: string, role: InboundRole, userId: string) {
  return withTransaction(async (tx) => {
    const inbound = await getInboundOrThrow(id, tx);
    validateTransition(inbound.status as never, InboundStatus.BARCODE_CREATED as never, role);
    for (const item of inbound.items) {
      const barcode = `${inbound.inboundNumber}-${item.id.substring(0, 8)}`;
      await tx.inboundItem.update({ where: { id: item.id }, data: { barcode } });
    }
    const updated = await tx.inbound.update({ where: { id }, data: { status: 'BARCODE_CREATED' } });
    await publishEventWithTx(tx, InboundEvents.BarcodeCreated, 'Inbound', inbound.id, { inboundNumber: inbound.inboundNumber }, userId);
    return updated;
  });
}

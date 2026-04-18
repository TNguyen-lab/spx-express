import { withTransaction } from '../../../../modules/shared/transactions.js';
import { publishEventWithTx } from '../../../../shared/events/application-event-publisher.js';
import { InboundEvents } from '../../domain/events/inbound.events.js';
import { validateTransition, type InboundRole } from '../../domain/aggregates/inbound-policy.js';
import { InboundStatus } from '../../../../constants/canonical-status.js';
import { getInboundOrThrow } from './_helpers.js';
import { recordInboundMovement, generatePhieuNhapKho } from '../../../inventory/index.js';

export async function passQC(
  id: string,
  role: InboundRole,
  userId: string,
  itemUpdates?: Array<{ id: string; receivedQty?: number; damageQty?: number }>,
) {
  return withTransaction(async (tx) => {
    if (itemUpdates && Array.isArray(itemUpdates)) {
      for (const update of itemUpdates) {
        await tx.inboundItem.update({ where: { id: update.id }, data: { receivedQty: update.receivedQty, damageQty: update.damageQty ?? 0 } });
      }
    }

    const inbound = await getInboundOrThrow(id, tx);
    validateTransition(inbound.status as never, InboundStatus.QC_PASSED as never, role);

    const updated = await tx.inbound.update({ where: { id }, data: { status: 'QC_PASSED', qcPassedDate: new Date() } });

    for (const item of inbound.items) {
      if (item.receivedQty > 0) {
        await recordInboundMovement(tx, {
          productId: item.productId,
          quantity: item.receivedQty,
          referenceType: 'Inbound',
          referenceId: inbound.id,
          createdById: userId,
          toLocationId: item.locationId,
          notes: `QC Pass for inbound ${inbound.inboundNumber}`,
        });
      }
    }

    const phieu = await generatePhieuNhapKho(tx, {
      inboundId: inbound.id,
      inboundNumber: inbound.inboundNumber,
      createdById: userId,
      notes: `Phiếu nhập kho cho inbound ${inbound.inboundNumber}`,
    });

    await publishEventWithTx(tx, InboundEvents.QCPassed, 'Inbound', inbound.id, { inboundNumber: inbound.inboundNumber, passed: true, phieuNumber: (phieu as any).phieuNumber }, userId);
    return { ...updated, phieu };
  });
}

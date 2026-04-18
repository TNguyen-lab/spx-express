import { publishEventWithTx } from '../../../../shared/events/application-event-publisher.js';
import { withTransaction } from '../../../shared/transactions.js';
import { OutboundStatus } from '../../../../constants/canonical-status.js';
import { recordDispatchMovement, generatePhieuXuatKho } from '../../../inventory/index.js';
import { OutboundEvents } from '../../domain/events/outbound.events.js';
import { getOutboundForReservation, validateTransition } from './_shared.js';

export async function moveToPacking(id: string, role: string, userId: string) {
  return withTransaction(async (tx) => {
    const outbound = await getOutboundForReservation(tx, id);
    validateTransition(outbound.status as never, OutboundStatus.MOVED_TO_PACKING as never, role);

    for (const item of outbound.items) {
      await recordDispatchMovement(tx, {
        productId: item.productId,
        quantity: item.quantity,
        referenceType: 'Outbound',
        referenceId: outbound.id,
        createdById: userId,
        notes: `Dispatched for outbound ${outbound.outboundNumber}`,
      });
    }

    const packingNumber = `PK${new Date().getFullYear()}${Date.now().toString().slice(-5)}`;
    const packing = await tx.packing.create({
      data: {
        packingNumber,
        outboundId: outbound.id,
        packerId: userId,
        status: 'PENDING',
      },
    });

    const phieu = await generatePhieuXuatKho(tx as never, {
      outboundId: outbound.id,
      outboundNumber: outbound.outboundNumber,
      createdById: userId,
    });

    const updated = await tx.outbound.update({
      where: { id },
      data: {
        status: 'MOVED_TO_PACKING',
        phieuXuatKhoId: phieu.id,
      } as never,
    });

    await publishEventWithTx(tx, OutboundEvents.MovedToPacking, 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
      packingNumber: packing.packingNumber,
    }, userId);

    return { outbound: updated, packing, phieu };
  });
}

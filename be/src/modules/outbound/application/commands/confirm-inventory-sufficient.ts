import { publishEventWithTx } from '../../../../shared/events/application-event-publisher.js';
import { OutboundStatus } from '../../../../constants/canonical-status.js';
import { recordReservationMovement } from '../../../inventory/index.js';
import { InventoryEvents } from '../../../inventory/domain/events/inventory.events.js';
import { OutboundEvents } from '../../domain/events/outbound.events.js';
import { withTransaction } from '../../../shared/transactions.js';
import { getOutboundForReservation, validateTransition } from './_shared.js';

export async function confirmInventorySufficient(id: string, role: string, userId: string) {
  const updated = await withTransaction(async (tx) => {
    const outbound = await getOutboundForReservation(tx, id);
    validateTransition(outbound.status as never, OutboundStatus.INVENTORY_SUFFICIENT as never, role);

    for (const item of outbound.items) {
      await recordReservationMovement(tx, {
        productId: item.productId,
        quantity: item.quantity,
        referenceType: 'Outbound',
        referenceId: outbound.id,
        createdById: userId,
        notes: `Reserved for outbound ${outbound.outboundNumber}`,
      });

      await publishEventWithTx(tx, InventoryEvents.Reserved, 'InventoryMovement', outbound.id, {
        movementType: 'RESERVATION',
        productId: item.productId,
        quantity: item.quantity,
        referenceType: 'Outbound',
        referenceId: outbound.id,
      }, userId);
    }

    const result = await tx.outbound.update({
      where: { id },
      data: { status: 'INVENTORY_SUFFICIENT' },
    });

    await publishEventWithTx(tx, OutboundEvents.InventorySufficient, 'Outbound', result.id, {
      outboundNumber: result.outboundNumber,
    }, userId);

    return result;
  });

  return updated;
}

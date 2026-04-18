import prisma from '../../../../config/db.js';
import { PurchaseOrderStatus } from '../../../../constants/canonical-status.js';
import { publishEventWithTx, publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { PurchaseOrderEvents } from '../../domain/events/purchase-order.events.js';
import { validateTransition, type PurchaseOrderRole } from '../../domain/aggregates/purchase-order-policy.js';
import { getOrderOrThrow, withTransaction } from './_helpers.js';
import { handleSupplierConfirmedHandoff } from '../../../inbound/application/events/purchase-order-handoff-handler.js';

export async function supplierResponse(id: string, role: PurchaseOrderRole, userId: string, confirmed: boolean) {
  const order = await getOrderOrThrow(id);

  if (confirmed) {
    return withTransaction(async (tx) => {
      validateTransition(order.status as never, PurchaseOrderStatus.SUPPLIER_CONFIRMED as never, role);

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'SUPPLIER_CONFIRMED' },
      });

      const inbound = await handleSupplierConfirmedHandoff({
        purchaseOrderId: order.id,
        userId,
        items: order.items.map((item) => ({ productId: item.productId, quantity: item.quantity, notes: `Created from ${order.orderNumber}` })),
        notes: `Inbound handoff for ${order.orderNumber}`,
        tx,
      });

      await publishEventWithTx(tx, PurchaseOrderEvents.SupplierConfirmed, 'PurchaseOrder', order.id, {
        orderNumber: order.orderNumber,
        confirmed: true,
        inboundNumber: inbound.inboundNumber,
      }, userId);

      await publishEventWithTx(tx, PurchaseOrderEvents.InboundCreated, 'Inbound', inbound.id, {
        inboundNumber: inbound.inboundNumber,
        purchaseOrderId: order.id,
      }, userId);

      return updated;
    });
  }

  validateTransition(order.status as never, PurchaseOrderStatus.SUPPLIER_REJECTED as never, role);

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'SUPPLIER_REJECTED' },
  });

  await publishEvent(PurchaseOrderEvents.SupplierRejected, 'PurchaseOrder', order.id, { orderNumber: order.orderNumber, confirmed: false }, userId);

  return updated;
}

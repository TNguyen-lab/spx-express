import prisma from '../../../../config/db.js';
import { PurchaseOrderStatus } from '../../../../constants/canonical-status.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { PurchaseOrderEvents } from '../../domain/events/purchase-order.events.js';
import { validateTransition, type PurchaseOrderRole } from '../../domain/aggregates/purchase-order-policy.js';
import { getOrderOrThrow } from './_helpers.js';

export async function sendToSupplier(id: string, role: PurchaseOrderRole, userId: string) {
  const order = await getOrderOrThrow(id);

  validateTransition(order.status as never, PurchaseOrderStatus.SENT_TO_SUPPLIER as never, role);

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'SENT_TO_SUPPLIER' },
  });

  await publishEvent(PurchaseOrderEvents.SentToSupplier, 'PurchaseOrder', order.id, {
    orderNumber: order.orderNumber,
    supplier: order.supplier?.name,
  }, userId);

  return updated;
}

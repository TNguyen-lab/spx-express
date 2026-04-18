import prisma from '../../../../config/db.js';
import { PurchaseOrderStatus } from '../../../../constants/canonical-status.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { PurchaseOrderEvents } from '../../domain/events/purchase-order.events.js';
import { validateTransition, type PurchaseOrderRole } from '../../domain/aggregates/purchase-order-policy.js';
import { getOrderOrThrow } from './_helpers.js';

export async function completePurchaseOrder(id: string, role: PurchaseOrderRole, userId: string) {
  const order = await getOrderOrThrow(id);

  validateTransition(order.status as never, PurchaseOrderStatus.COMPLETED as never, role);

  if (!order.inbound) {
    throw new Error('Inbound handoff not found for purchase order');
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'COMPLETED' },
  });

  await publishEvent(PurchaseOrderEvents.Completed, 'PurchaseOrder', order.id, { orderNumber: order.orderNumber }, userId);

  return updated;
}

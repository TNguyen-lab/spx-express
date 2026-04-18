import prisma from '../../../../config/db.js';
import { PurchaseOrderStatus } from '../../../../constants/canonical-status.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { PurchaseOrderEvents } from '../../domain/events/purchase-order.events.js';
import { validateTransition, type PurchaseOrderRole } from '../../domain/aggregates/purchase-order-policy.js';
import { getOrderOrThrow } from './_helpers.js';

export async function rejectPurchaseOrder(id: string, role: PurchaseOrderRole, userId: string, notes?: string) {
  const order = await getOrderOrThrow(id);

  validateTransition(order.status as never, PurchaseOrderStatus.CANCELLED as never, role);

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'CANCELLED', notes: notes || order.notes },
  });

  await prisma.purchaseOrderApproval.create({
    data: {
      purchaseOrderId: order.id,
      approverId: userId,
      role: 'WAREHOUSE_DIRECTOR',
      status: 'REJECTED',
      notes,
      approvedAt: new Date(),
    },
  });

  await publishEvent(PurchaseOrderEvents.Rejected, 'PurchaseOrder', order.id, { orderNumber: order.orderNumber, reason: notes }, userId);

  return updated;
}

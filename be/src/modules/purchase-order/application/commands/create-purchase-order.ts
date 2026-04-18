import prisma from '../../../../config/db.js';
import { PurchaseOrderEvents } from '../../domain/events/purchase-order.events.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { CreatePurchaseOrderInput } from './_helpers.js';

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  const orderNumber = await prisma.purchaseOrder.count().then((count: number) => `PO${new Date().getFullYear()}${(count + 1).toString().padStart(5, '0')}`);
  const itemsData = input.items.map((item) => ({
    ...item,
    totalPrice: item.quantity * item.unitPrice,
  }));

  const totalAmount = itemsData.reduce((sum, item) => sum + item.totalPrice, 0);

  const order = await prisma.purchaseOrder.create({
    data: {
      orderNumber,
      supplierId: input.supplierId,
      expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
      notes: input.notes,
      createdById: input.userId,
      status: 'DRAFT',
      items: {
        create: itemsData,
      },
    },
    include: {
      supplier: true,
      createdBy: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
  });

  await publishEvent(
    PurchaseOrderEvents.Created,
    'PurchaseOrder',
    order.id,
    {
      orderNumber: order.orderNumber,
      supplier: order.supplier.name,
      totalAmount,
    },
    input.userId,
  );

  return order;
}

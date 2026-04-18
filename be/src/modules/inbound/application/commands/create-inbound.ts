import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { InboundEvents } from '../../domain/events/inbound.events.js';
import { generateInboundNumber } from './_helpers.js';

export async function createInbound(input: {
  purchaseOrderId?: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number; notes?: string }>;
  userId: string;
  tx?: {
    inbound: typeof prisma.inbound;
    purchaseOrder: typeof prisma.purchaseOrder;
  };
}) {
  const db = input.tx ?? prisma;

  if (input.purchaseOrderId) {
    const purchaseOrderFinder = db.purchaseOrder?.findUnique;
    if (purchaseOrderFinder) {
      const purchaseOrder = await purchaseOrderFinder.call(db.purchaseOrder, { where: { id: input.purchaseOrderId } });
      if (!purchaseOrder) throw new Error('Đơn đặt hàng không tồn tại. Purchase order not found.');
      if (purchaseOrder.status !== 'SUPPLIER_CONFIRMED') {
        throw new Error(`Chỉ có thể tạo phiếu nhập kho từ đơn đặt hàng đã được NCC xác nhận. Trạng thái hiện tại: ${purchaseOrder.status}. Only purchase orders with SUPPLIER_CONFIRMED status can create inbound receipts.`);
      }
    }

    const existingInboundFinder = db.inbound?.findUnique;
    if (existingInboundFinder) {
      const existingInbound = await existingInboundFinder.call(db.inbound, {
        where: { purchaseOrderId: input.purchaseOrderId },
        include: {
          purchaseOrder: { include: { supplier: true } },
          items: { include: { product: true } },
        },
      });

      if (existingInbound) return existingInbound;
    }
  }

  const inboundNumber = await generateInboundNumber(input.tx);

  const inbound = await db.inbound.create({
    data: {
      inboundNumber,
      purchaseOrderId: input.purchaseOrderId,
      staffId: input.userId,
      notes: input.notes,
      status: 'INBOUND_CREATED',
      items: { create: input.items.map((item) => ({ productId: item.productId, quantity: item.quantity, notes: item.notes })) },
    },
    include: {
      purchaseOrder: { include: { supplier: true } },
      items: { include: { product: true } },
    },
  });

  await publishEvent(InboundEvents.Created, 'Inbound', inbound.id, { inboundNumber: inbound.inboundNumber, itemCount: input.items.length }, input.userId);
  return inbound;
}

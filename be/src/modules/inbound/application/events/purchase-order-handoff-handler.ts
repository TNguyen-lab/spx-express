import prisma from '../../../../config/db.js';
import { subscriberRegistry } from '../../../../events/subscribers.js';
import { PurchaseOrderEvents } from '../../../purchase-order/domain/events/purchase-order.events.js';
import { createInbound } from '../commands/create-inbound.js';

export async function handleSupplierConfirmedHandoff(input: {
  purchaseOrderId: string;
  inboundNumberHint?: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; notes?: string }>;
  notes?: string;
  tx?: Parameters<typeof createInbound>[0]['tx'];
}) {
  return createInbound({
    purchaseOrderId: input.purchaseOrderId,
    notes: input.notes,
    items: input.items,
    userId: input.userId,
    tx: input.tx,
  });
}

export function registerPurchaseOrderHandoffHandler(): void {
  subscriberRegistry.subscribe(PurchaseOrderEvents.SupplierConfirmed, async (payload) => {
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const purchaseOrderId = String(payload.entityId || data.purchaseOrderId || '');
    const userId = String(payload.userId || '');

    if (!purchaseOrderId || !userId) {
      throw new Error('Missing purchase order handoff payload');
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found for inbound handoff');
    }

    await handleSupplierConfirmedHandoff({
      purchaseOrderId,
      userId,
      items: purchaseOrder.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      notes: `Inbound handoff for ${purchaseOrder.orderNumber}`,
    });
  }, 'Create inbound when supplier confirms purchase order');
}

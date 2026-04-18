import type { Prisma } from '@prisma/client';
import prisma from '../../../../config/db.js';
import { PurchaseOrderStatus } from '../../../../constants/canonical-status.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { PurchaseOrderEvents } from '../../domain/events/purchase-order.events.js';
import { validateTransition } from '../../domain/aggregates/purchase-order-policy.js';
import { withTransaction } from '../../../../modules/shared/transactions.js';

export type { PurchaseOrderRole } from '../../domain/aggregates/purchase-order-policy.js';

export interface CreatePurchaseOrderInput {
  supplierId: string;
  expectedDate?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  userId: string;
}

async function generateOrderNumber(): Promise<string> {
  const count = await prisma.purchaseOrder.count();
  const num = (count + 1).toString().padStart(5, '0');
  return `PO${new Date().getFullYear()}${num}`;
}

async function getOrderOrThrow(id: string) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: true,
      approvals: { include: { approver: { select: { id: true, name: true } } } },
      inbound: true,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  return order;
}

async function generateInboundNumber(tx?: { inbound: { count: () => Promise<number> } }): Promise<string> {
  const count = tx ? await tx.inbound.count() : await prisma.inbound.count();
  const num = (count + 1).toString().padStart(5, '0');
  return `IN${new Date().getFullYear()}${num}`;
}

async function createInboundHandoff(
  tx: Prisma.TransactionClient,
  order: Awaited<ReturnType<typeof getOrderOrThrow>>,
  userId: string,
) {
  const inboundNumber = await generateInboundNumber(tx);

  return tx.inbound.create({
    data: {
      inboundNumber,
      purchaseOrderId: order.id,
      staffId: userId,
      status: 'INBOUND_CREATED',
      notes: `Inbound handoff for ${order.orderNumber}`,
      items: {
        create: order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: `Created from ${order.orderNumber}`,
        })),
      },
    },
  });
}

export { generateOrderNumber, getOrderOrThrow, createInboundHandoff, withTransaction, publishEvent, validateTransition, PurchaseOrderStatus, PurchaseOrderEvents };

import prisma from '../../../../config/db.js';
import { withTransaction } from '../../../../modules/shared/transactions.js';
import { publishEventWithTx } from '../../../../shared/events/application-event-publisher.js';
import { InboundEvents } from '../../domain/events/inbound.events.js';
import { validateTransition, type InboundRole } from '../../domain/aggregates/inbound-policy.js';
import { InboundStatus } from '../../../../constants/canonical-status.js';
import { getInboundOrThrow } from './_helpers.js';
import { recordInboundMovement } from '../../../inventory/application/commands/movements/record-inbound-movement.js';

export async function completeInbound(id: string, role: InboundRole, userId: string) {
  const updated = await withTransaction(async (tx) => {
    const inbound = await getInboundOrThrow(id, tx);
    const newProductsCreated: string[] = [];

    for (const item of inbound.items) {
      const existingProduct = await tx.product.findUnique({ where: { id: item.productId } });
      if (!existingProduct) {
        const count = await tx.product.count();
        const sku = `PROD-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
        await tx.product.create({ data: { id: item.productId, sku, name: `New Product ${item.productId.substring(0, 8)}` } });
        newProductsCreated.push(item.productId);
        await publishEventWithTx(tx, InboundEvents.NewProductCreated, 'Inbound', inbound.id, { inboundNumber: inbound.inboundNumber, productId: item.productId, sku }, userId);
      }
    }

    if (newProductsCreated.length > 0) {
      validateTransition(inbound.status as never, InboundStatus.NEW_PRODUCT_CREATED as never, role);
      await tx.inbound.update({ where: { id }, data: { status: 'NEW_PRODUCT_CREATED' } });
      validateTransition(InboundStatus.NEW_PRODUCT_CREATED as never, InboundStatus.INVENTORY_UPDATED as never, role);
    } else {
      validateTransition(inbound.status as never, InboundStatus.INVENTORY_UPDATED as never, role);
    }

    for (const item of inbound.items) {
      await recordInboundMovement(tx, {
        productId: item.productId,
        quantity: item.receivedQty,
        referenceType: 'Inbound',
        referenceId: inbound.id,
        createdById: userId,
        notes: item.notes || `Inbound completion for ${inbound.inboundNumber}`,
      });
      await publishEventWithTx(tx, InboundEvents.InventoryUpdated, 'Inbound', inbound.id, { inboundNumber: inbound.inboundNumber, productId: item.productId, quantity: item.receivedQty }, userId);
    }

    await tx.inbound.update({ where: { id }, data: { status: 'INVENTORY_UPDATED' } });
    const updatedInbound = await tx.inbound.update({ where: { id }, data: { status: 'INBOUND_COMPLETED', completedDate: new Date() } });
    
    await publishEventWithTx(tx, InboundEvents.Completed, 'Inbound', updatedInbound.id, {
      inboundNumber: updatedInbound.inboundNumber,
      itemsUpdated: inbound.items.length,
      newProductsCreated: newProductsCreated.length,
    }, userId);
    
    return { updatedInbound, inbound, newProductsCreated };
  });

  return updated.updatedInbound;
}
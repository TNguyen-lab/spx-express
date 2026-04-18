import prisma from '../../../../config/db.js';
import { withTransaction } from '../../../../shared/transactions/index.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { InventoryCheckEvents } from '../../domain/events/inventory-check.events.js';

export async function startCountSession(checkId: string, userId: string) {
  const check = await prisma.inventoryCheck.findUnique({ where: { id: checkId }, include: { items: true } });
  if (!check) throw new Error('Check not found');
  if (check.status !== 'PENDING') throw new Error('Check not in PENDING status');

  const productIds = check.items.map((item) => item.productId);
  const inventories = await prisma.inventory.findMany({ where: { productId: { in: productIds } } });
  const inventoryMap = new Map(inventories.map((inv) => [inv.productId, inv]));

  await withTransaction(async (tx) => {
    for (const item of check.items) {
      const inv = inventoryMap.get(item.productId);
      const systemQty = inv?.quantity || 0;
      await tx.inventoryCheckItem.update({ where: { id: item.id }, data: { systemQty, actualQty: systemQty } });
    }

    await tx.inventoryCheck.update({ where: { id: checkId }, data: { status: 'IN_PROGRESS', startDate: new Date() } });
  });

  const updatedCheck = await prisma.inventoryCheck.findUnique({
    where: { id: checkId },
    include: {
      checker: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
  });

  await publishEvent(InventoryCheckEvents.PhysicalCountStarted, 'InventoryCheck', check.id, { checkNumber: check.checkNumber }, userId);
  return updatedCheck;
}

import prisma from '../config/db.js';
import { eventEmitter } from '../events/emitter.js';
import { OutboundStatus } from '../constants/workflow-status';
import { validateTransition } from './outbound-state-machine.js';

type Role = 'ADMIN' | 'QUALITY' | 'ACCOUNTING' | 'WAREHOUSE_DIRECTOR' | 'STAFF' | 'DRIVER';

interface CreateOutboundInput {
  orderRef?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  userId: string;
}

async function generateOutboundNumber(): Promise<string> {
  const count = await prisma.outbound.count();
  const num = (count + 1).toString().padStart(5, '0');
  return `OUT${new Date().getFullYear()}${num}`;
}

async function getOutboundOrThrow(id: string) {
  const outbound = await prisma.outbound.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!outbound) {
    throw new Error('Outbound not found');
  }
  return outbound;
}

const DB_TO_WORKFLOW: Record<string, string> = {
  ORDER_RECEIVED: OutboundStatus.ORDER_RECEIVED,
  INVENTORY_CHECKED: OutboundStatus.INVENTORY_CHECKED,
  INVENTORY_SUFFICIENT: OutboundStatus.INVENTORY_SUFFICIENT,
  INVENTORY_INSUFFICIENT: OutboundStatus.INVENTORY_INSUFFICIENT,
  PICKING_ASSIGNED: OutboundStatus.PICKING_ASSIGNED,
  PICKER_ASSIGNED: OutboundStatus.PICKER_ASSIGNED,
  ITEM_SCANNED: OutboundStatus.ITEM_SCANNED,
  PICKED_CORRECT: OutboundStatus.PICKED_CORRECT,
  PICKED_WRONG: OutboundStatus.PICKED_WRONG,
  PUT_IN_CART: OutboundStatus.PUT_IN_CART,
  SLIP_PRINTED: OutboundStatus.SLIP_PRINTED,
  MOVED_TO_PACKING: OutboundStatus.MOVED_TO_PACKING,
};

const WORKFLOW_TO_DB: Record<string, string> = {
  P03_ORDER_RECEIVED: 'ORDER_RECEIVED',
  P03_INVENTORY_CHECKED: 'INVENTORY_CHECKED',
  P03_INVENTORY_SUFFICIENT: 'INVENTORY_SUFFICIENT',
  P03_INVENTORY_INSUFFICIENT: 'INVENTORY_INSUFFICIENT',
  P03_PICKING_ASSIGNED: 'PICKING_ASSIGNED',
  P03_PICKER_ASSIGNED: 'PICKER_ASSIGNED',
  P03_ITEM_SCANNED: 'ITEM_SCANNED',
  P03_PICKED_CORRECT: 'PICKED_CORRECT',
  P03_PICKED_WRONG: 'PICKED_WRONG',
  P03_PUT_IN_CART: 'PUT_IN_CART',
  P03_SLIP_PRINTED: 'SLIP_PRINTED',
  P03_MOVED_TO_PACKING: 'MOVED_TO_PACKING',
};

export function toWorkflowStatus(dbStatus: string): string {
  return DB_TO_WORKFLOW[dbStatus] ?? dbStatus;
}

export function toDbStatus(workflowStatus: string): string {
  return WORKFLOW_TO_DB[workflowStatus] ?? workflowStatus;
}

/**
 * Transform outbound data from DB format to API response format.
 * Converts DB enum status (e.g. 'ORDER_RECEIVED') to workflow status (e.g. 'P03_ORDER_RECEIVED')
 * so the frontend can correctly match status values for action button visibility.
 */
export function transformOutbound<T extends { status: string }>(outbound: T): T & { status: string } {
  return { ...outbound, status: toWorkflowStatus(outbound.status) };
}

export function transformOutbounds<T extends { status: string }>(outbounds: T[]): (T & { status: string })[] {
  return outbounds.map(transformOutbound);
}

export const outboundService = {
  async createOutbound(input: CreateOutboundInput) {
    const outboundNumber = await generateOutboundNumber();

    const outbound = await prisma.outbound.create({
      data: {
        outboundNumber,
        orderRef: input.orderRef,
        pickerId: input.userId,
        status: 'ORDER_RECEIVED',
        notes: input.notes,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        picker: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });

    await eventEmitter.emit('OUTBOUND_ORDER_RECEIVED', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
      orderRef: outbound.orderRef,
    }, input.userId);

    return outbound;
  },

  async checkInventory(id: string, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.INVENTORY_CHECKED as never,
      role
    );

    const updated = await prisma.outbound.update({
      where: { id },
      data: { status: 'INVENTORY_CHECKED' },
    });

    await eventEmitter.emit('OUTBOUND_INVENTORY_CHECKED', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
    }, userId);

    return updated;
  },

  async confirmInventorySufficient(id: string, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.INVENTORY_SUFFICIENT as never,
      role
    );

    const updated = await prisma.outbound.update({
      where: { id },
      data: { status: 'INVENTORY_SUFFICIENT' },
    });

    await eventEmitter.emit('OUTBOUND_INVENTORY_SUFFICIENT', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
    }, userId);

    return updated;
  },

  async markInventoryInsufficient(id: string, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.INVENTORY_INSUFFICIENT as never,
      role
    );

    const updated = await prisma.outbound.update({
      where: { id },
      data: { status: 'INVENTORY_INSUFFICIENT' },
    });

    await eventEmitter.emit('OUTBOUND_INVENTORY_INSUFFICIENT', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
    }, userId);

    return updated;
  },

  async assignPicking(id: string, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.PICKING_ASSIGNED as never,
      role
    );

    const updated = await prisma.outbound.update({
      where: { id },
      data: { status: 'PICKING_ASSIGNED' },
    });

    await eventEmitter.emit('OUTBOUND_PICKING_ASSIGNED', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
    }, userId);

    return updated;
  },

  async assignPicker(id: string, pickerId: string, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.PICKER_ASSIGNED as never,
      role
    );

    const picker = await prisma.user.findUnique({ where: { id: pickerId } });
    if (!picker) {
      throw new Error('Picker not found');
    }

    const updated = await prisma.outbound.update({
      where: { id },
      data: { pickerId, status: 'PICKER_ASSIGNED' },
    });

    await eventEmitter.emit('OUTBOUND_PICKER_ASSIGNED', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
      pickerId,
      pickerName: picker.name,
    }, userId);

    return updated;
  },

  async scanItem(id: string, productId: string, barcode: string, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.ITEM_SCANNED as never,
      role
    );

    const updated = await prisma.outbound.update({
      where: { id },
      data: { status: 'ITEM_SCANNED' },
    });

    await eventEmitter.emit('OUTBOUND_ITEM_SCANNED', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
      productId,
      barcode,
    }, userId);

    return updated;
  },

  async confirmPickedCorrect(id: string, itemId: string, pickedQty: number, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.PICKED_CORRECT as never,
      role
    );

    await prisma.outboundItem.update({
      where: { id: itemId },
      data: { pickedQty },
    });

    const updated = await prisma.outbound.update({
      where: { id },
      data: { status: 'PICKED_CORRECT' },
    });

    await eventEmitter.emit('OUTBOUND_PICKED_CORRECT', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
      itemId,
      pickedQty,
    }, userId);

    return updated;
  },

  async markPickedWrong(id: string, itemId: string, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.PICKED_WRONG as never,
      role
    );

    const updated = await prisma.outbound.update({
      where: { id },
      data: { status: 'PICKED_WRONG' },
    });

    await eventEmitter.emit('OUTBOUND_PICKED_WRONG', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
      itemId,
      message: 'Item picked incorrectly, please rescan',
    }, userId);

    return updated;
  },

  async rescanItem(id: string, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.ITEM_SCANNED as never,
      role
    );

    const updated = await prisma.outbound.update({
      where: { id },
      data: { status: 'ITEM_SCANNED' },
    });

    await eventEmitter.emit('OUTBOUND_ITEM_SCANNED', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
      rescan: true,
    }, userId);

    return updated;
  },

  async putInCart(id: string, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.PUT_IN_CART as never,
      role
    );

    const updated = await prisma.outbound.update({
      where: { id },
      data: { status: 'PUT_IN_CART' },
    });

    await eventEmitter.emit('OUTBOUND_PUT_IN_CART', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
    }, userId);

    return updated;
  },

  async printSlip(id: string, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.SLIP_PRINTED as never,
      role
    );

    const updated = await prisma.outbound.update({
      where: { id },
      data: { status: 'SLIP_PRINTED' },
    });

    await eventEmitter.emit('OUTBOUND_SLIP_PRINTED', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
    }, userId);

    return updated;
  },

  async moveToPacking(id: string, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.MOVED_TO_PACKING as never,
      role
    );

    const packingNumber = `PK${new Date().getFullYear()}${Date.now().toString().slice(-5)}`;
    const packing = await prisma.packing.create({
      data: {
        packingNumber,
        outboundId: outbound.id,
        packerId: userId,
        status: 'PENDING',
      },
    });

    const updated = await prisma.outbound.update({
      where: { id },
      data: { status: 'MOVED_TO_PACKING' },
    });

    await eventEmitter.emit('OUTBOUND_MOVED_TO_PACKING', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
      packingNumber: packing.packingNumber,
    }, userId);

    return { outbound: updated, packing };
  },

  async recheckInventory(id: string, role: Role, userId: string) {
    const outbound = await getOutboundOrThrow(id);
    validateTransition(
      toWorkflowStatus(outbound.status) as never,
      OutboundStatus.INVENTORY_CHECKED as never,
      role
    );

    const updated = await prisma.outbound.update({
      where: { id },
      data: { status: 'INVENTORY_CHECKED' },
    });

    await eventEmitter.emit('OUTBOUND_INVENTORY_CHECKED', 'Outbound', outbound.id, {
      outboundNumber: outbound.outboundNumber,
      recheck: true,
    }, userId);

    return updated;
  },
};
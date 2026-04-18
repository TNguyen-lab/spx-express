import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  recordAdjustmentMovement,
  recordDispatchMovement,
  recordInboundMovement,
  recordReservationMovement,
  recordTransferInMovement,
  recordTransferOutMovement,
} from '../../modules/inventory/index.js';

vi.mock('../../shared/events/application-event-publisher.js', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  publishEventWithTx: vi.fn().mockResolvedValue(undefined),
}));

function createTx() {
  return {
    inventory: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    inventoryMovement: {
      create: vi.fn(),
    },
  };
}

describe('inventory-movement', () => {
  let tx: ReturnType<typeof createTx>;

  beforeEach(() => {
    tx = createTx();
    vi.clearAllMocks();
  });

  it('reserves inventory and writes a reservation movement', async () => {
    tx.inventory.findUnique.mockResolvedValue({ productId: 'p1', quantity: 10, available: 10, reserved: 0 });
    tx.inventory.update.mockResolvedValue({ productId: 'p1', quantity: 10, available: 6, reserved: 4 });
    tx.inventoryMovement.create.mockResolvedValue({ id: 'm1' });

    await recordReservationMovement(tx as never, {
      productId: 'p1',
      quantity: 4,
      referenceType: 'Outbound',
      referenceId: 'out-1',
      createdById: 'u1',
    });

    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      data: { available: { decrement: 4 }, reserved: { increment: 4 } },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        movementType: 'RESERVATION',
        quantity: 4,
        referenceType: 'Outbound',
        referenceId: 'out-1',
        createdById: 'u1',
      }),
    });
  });

  it('increases stock and writes an inbound movement', async () => {
    tx.inventory.findUnique.mockResolvedValue(null);
    tx.inventory.create.mockResolvedValue({ productId: 'p9', quantity: 5, available: 5, reserved: 0, costPrice: 0 });
    tx.inventoryMovement.create.mockResolvedValue({ id: 'm0' });

    await recordInboundMovement(tx as never, {
      productId: 'p9',
      quantity: 5,
      referenceType: 'Inbound',
      referenceId: 'in-1',
      createdById: 'u1',
    });

    expect(tx.inventory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ productId: 'p9', quantity: 5, available: 5 }),
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ movementType: 'INBOUND', quantity: 5 }),
    });
  });

  it('posts dispatch movement at shipment handoff', async () => {
    tx.inventory.findUnique.mockResolvedValue({ productId: 'p1', quantity: 10, available: 6, reserved: 4 });
    tx.inventory.update.mockResolvedValue({ productId: 'p1', quantity: 6, available: 6, reserved: 0 });
    tx.inventoryMovement.create.mockResolvedValue({ id: 'm3' });

    await recordDispatchMovement(tx as never, {
      productId: 'p1',
      quantity: 4,
      referenceType: 'Shipment',
      referenceId: 'sh-1',
      createdById: 'u1',
    });

    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      data: { quantity: { decrement: 4 }, reserved: { decrement: 4 } },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ movementType: 'OUTBOUND', quantity: 4 }),
    });
  });

  it('records transfer in and out movements', async () => {
    tx.inventory.findUnique.mockResolvedValue({ productId: 'p1', quantity: 10, available: 10, reserved: 0 });
    tx.inventory.update.mockResolvedValue({ productId: 'p1', quantity: 6, available: 6, reserved: 0 });
    tx.inventoryMovement.create.mockResolvedValue({ id: 'm4' });

    await recordTransferOutMovement(tx as never, {
      productId: 'p1',
      quantity: 4,
      referenceType: 'Transfer',
      referenceId: 'tr-1',
      fromLocationId: 'loc-a',
      toLocationId: 'loc-b',
      createdById: 'u1',
    });

    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      data: { quantity: { decrement: 4 }, available: { decrement: 4 } },
    });

    tx.inventory.findUnique.mockResolvedValueOnce(null);
    tx.inventory.create.mockResolvedValue({ productId: 'p2', quantity: 0, available: 0, reserved: 0, costPrice: 0 });

    await recordTransferInMovement(tx as never, {
      productId: 'p2',
      quantity: 5,
      referenceType: 'Transfer',
      referenceId: 'tr-1',
      toLocationId: 'loc-b',
      createdById: 'u1',
    });

    expect(tx.inventory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ productId: 'p2' }),
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ movementType: 'TRANSFER_IN', quantity: 5 }),
    });
  });

  it('records count adjustments', async () => {
    tx.inventory.findUnique.mockResolvedValue({ productId: 'p1', quantity: 10, available: 10, reserved: 0 });
    tx.inventory.update.mockResolvedValue({ productId: 'p1', quantity: 7, available: 7, reserved: 0 });
    tx.inventoryMovement.create.mockResolvedValue({ id: 'm5' });

    await recordAdjustmentMovement(tx as never, {
      productId: 'p1',
      systemQuantity: 10,
      actualQuantity: 7,
      referenceType: 'InventoryCheck',
      referenceId: 'chk-1',
      createdById: 'u1',
    });

    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      data: {
        quantity: { increment: -3 },
        available: { increment: -3 },
      },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        movementType: 'ADJUSTMENT',
        quantity: -3,
      }),
    });
  });
});

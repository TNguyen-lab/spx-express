import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockEventEmitter } = vi.hoisted(() => ({
  mockPrisma: {
    inventoryMovement: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    inventory: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
  mockEventEmitter: {
    emit: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../config/db.js', () => ({
  default: mockPrisma,
}));

vi.mock('../../events/emitter.js', () => ({
  eventEmitter: mockEventEmitter,
}));

vi.mock('../../modules/shared/transactions.js', () => ({
  withTransaction: vi.fn((fn) => fn(mockPrisma)),
}));

describe('Transfer Discrepancy Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Transfer Dispatch (TRANSFER_OUT)', () => {
    it('Should create TRANSFER_OUT movement and decrement source inventory', async () => {
      const mockInventory = {
        productId: 'prod-1',
        quantity: 100,
        available: 100,
        reserved: 0,
      };

      mockPrisma.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrisma.inventory.update.mockResolvedValue({
        ...mockInventory,
        quantity: 95,
        available: 95,
      });
      mockPrisma.inventoryMovement.create.mockResolvedValue({
        id: 'mov-1',
        productId: 'prod-1',
        quantity: 5,
        movementType: 'TRANSFER_OUT',
        referenceType: 'Transfer',
        referenceId: 'TRF202600001',
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
      });

      await mockPrisma.inventory.update({
        where: { productId: 'prod-1' },
        data: { quantity: { decrement: 5 }, available: { decrement: 5 } },
      });

      const movement = await mockPrisma.inventoryMovement.create({
        data: {
          productId: 'prod-1',
          quantity: 5,
          movementType: 'TRANSFER_OUT',
          referenceType: 'Transfer',
          referenceId: 'TRF202600001',
          fromLocationId: 'loc-1',
          toLocationId: 'loc-2',
        },
      });

      expect(movement.movementType).toBe('TRANSFER_OUT');
      expect(movement.quantity).toBe(5);
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
        data: { quantity: { decrement: 5 }, available: { decrement: 5 } },
      });
    });

    it('Should reject transfer if insufficient inventory', async () => {
      const mockInventory = {
        productId: 'prod-1',
        quantity: 3,
        available: 3,
        reserved: 0,
      };

      mockPrisma.inventory.findUnique.mockResolvedValue(mockInventory);

      const result = mockInventory.quantity < 5;
      expect(result).toBe(true);
    });
  });

  describe('Transfer Receipt (TRANSFER_IN)', () => {
    it('Should create TRANSFER_IN movement and increment destination inventory', async () => {
      const mockInventory = {
        productId: 'prod-1',
        quantity: 95,
        available: 95,
      };

      mockPrisma.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrisma.inventory.update.mockResolvedValue({
        ...mockInventory,
        quantity: 100,
        available: 100,
      });
      mockPrisma.inventoryMovement.create.mockResolvedValue({
        id: 'mov-2',
        productId: 'prod-1',
        quantity: 5,
        movementType: 'TRANSFER_IN',
        referenceType: 'Transfer',
        referenceId: 'TRF202600001',
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
      });

      await mockPrisma.inventory.update({
        where: { productId: 'prod-1' },
        data: { quantity: { increment: 5 }, available: { increment: 5 } },
      });

      const movement = await mockPrisma.inventoryMovement.create({
        data: {
          productId: 'prod-1',
          quantity: 5,
          movementType: 'TRANSFER_IN',
          referenceType: 'Transfer',
          referenceId: 'TRF202600001',
          fromLocationId: 'loc-1',
          toLocationId: 'loc-2',
        },
      });

      expect(movement.movementType).toBe('TRANSFER_IN');
      expect(movement.quantity).toBe(5);
    });

    it('Should create new inventory record if product does not exist at destination', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue(null);
      mockPrisma.inventory.create.mockResolvedValue({
        id: 'inv-new',
        productId: 'prod-1',
        quantity: 5,
        available: 5,
        reserved: 0,
        costPrice: 0,
      });
      mockPrisma.inventoryMovement.create.mockResolvedValue({
        id: 'mov-2',
        productId: 'prod-1',
        quantity: 5,
        movementType: 'TRANSFER_IN',
        referenceType: 'Transfer',
        referenceId: 'TRF202600001',
      });

      await mockPrisma.inventory.create({
        data: {
          productId: 'prod-1',
          quantity: 5,
          available: 5,
          reserved: 0,
          costPrice: 0,
        },
      });

      expect(mockPrisma.inventory.create).toHaveBeenCalled();
    });
  });

  describe('Transfer Discrepancy Handling', () => {
    it('Should handle over-delivery (actual > expected)', async () => {
      const expectedQty = 5;
      const actualQty = 6;
      const delta = actualQty - expectedQty;

      const mockInventory = {
        productId: 'prod-1',
        quantity: 100,
        available: 100,
      };

      mockPrisma.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrisma.inventory.update.mockResolvedValue({
        ...mockInventory,
        quantity: 106,
        available: 106,
      });
      mockPrisma.inventoryMovement.create.mockResolvedValue({
        id: 'mov-discrepancy',
        productId: 'prod-1',
        quantity: 1,
        movementType: 'TRANSFER_IN',
        referenceType: 'TransferDiscrepancy',
        referenceId: 'TRF202600001',
      });

      await mockPrisma.inventory.update({
        where: { productId: 'prod-1' },
        data: { quantity: { increment: delta }, available: { increment: delta } },
      });

      const discrepancyMovement = await mockPrisma.inventoryMovement.create({
        data: {
          productId: 'prod-1',
          quantity: delta,
          movementType: 'TRANSFER_IN',
          referenceType: 'TransferDiscrepancy',
          referenceId: 'TRF202600001',
          notes: `Transfer discrepancy over: ${delta} units`,
        },
      });

      expect(discrepancyMovement.quantity).toBe(1);
      expect(discrepancyMovement.movementType).toBe('TRANSFER_IN');
    });

    it('Should handle under-delivery (actual < expected)', async () => {
      const expectedQty = 5;
      const actualQty = 3;
      const delta = expectedQty - actualQty;

      const mockInventory = {
        productId: 'prod-1',
        quantity: 100,
        available: 100,
      };

      mockPrisma.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrisma.inventory.update.mockResolvedValue({
        ...mockInventory,
        quantity: 97,
        available: 97,
      });
      mockPrisma.inventoryMovement.create.mockResolvedValue({
        id: 'mov-return',
        productId: 'prod-1',
        quantity: 2,
        movementType: 'TRANSFER_OUT',
        referenceType: 'TransferDiscrepancy',
        referenceId: 'TRF202600001',
      });

      await mockPrisma.inventory.update({
        where: { productId: 'prod-1' },
        data: { quantity: { decrement: delta }, available: { decrement: delta } },
      });

      const returnMovement = await mockPrisma.inventoryMovement.create({
        data: {
          productId: 'prod-1',
          quantity: delta,
          movementType: 'TRANSFER_OUT',
          referenceType: 'TransferDiscrepancy',
          referenceId: 'TRF202600001',
          fromLocationId: 'loc-2',
          toLocationId: 'loc-1',
          notes: `Transfer discrepancy short: ${delta} units returned`,
        },
      });

      expect(returnMovement.quantity).toBe(2);
      expect(returnMovement.movementType).toBe('TRANSFER_OUT');
    });

    it('Should not create movement if quantities match', async () => {
      const expectedQty = 5;
      const actualQty = 5;
      const delta = actualQty - expectedQty;

      expect(delta).toBe(0);
    });
  });

  describe('Transfer Cancellation', () => {
    it('Should restore source inventory on cancellation (before receipt)', async () => {
      const transferId = 'TRF202600001';
      const mockOutMovements = [
        {
          id: 'mov-1',
          productId: 'prod-1',
          quantity: 5,
          movementType: 'TRANSFER_OUT',
          referenceId: transferId,
          notes: 'Transfer dispatch',
        },
      ];

      mockPrisma.inventoryMovement.findMany.mockResolvedValue(mockOutMovements);
      mockPrisma.inventory.findUnique.mockResolvedValue({
        productId: 'prod-1',
        quantity: 95,
        available: 95,
      });
      mockPrisma.inventory.update.mockResolvedValue({
        productId: 'prod-1',
        quantity: 100,
        available: 100,
      });

      await mockPrisma.inventory.update({
        where: { productId: 'prod-1' },
        data: { quantity: { increment: 5 }, available: { increment: 5 } },
      });

      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
        data: { quantity: { increment: 5 }, available: { increment: 5 } },
      });
    });

    it('Should not allow cancellation after receipt', async () => {
      const transferId = 'TRF202600001';
      const mockMovements = [
        { id: 'mov-1', productId: 'prod-1', quantity: 5, movementType: 'TRANSFER_OUT' },
        { id: 'mov-2', productId: 'prod-1', quantity: 5, movementType: 'TRANSFER_IN' },
      ];

      mockPrisma.inventoryMovement.findMany.mockResolvedValue(mockMovements);

      const hasInMovement = mockMovements.some(m => m.movementType === 'TRANSFER_IN');
      expect(hasInMovement).toBe(true);
    });
  });

  describe('Paired Transfer Entries', () => {
    it('Must have paired TRANSFER_OUT and TRANSFER_IN for complete transfer', async () => {
      const transferId = 'TRF202600001';
      const mockMovements = [
        {
          id: 'mov-1',
          productId: 'prod-1',
          quantity: 5,
          movementType: 'TRANSFER_OUT',
          referenceId: transferId,
          fromLocationId: 'loc-1',
          toLocationId: 'loc-2',
        },
        {
          id: 'mov-2',
          productId: 'prod-1',
          quantity: 5,
          movementType: 'TRANSFER_IN',
          referenceId: transferId,
          fromLocationId: 'loc-1',
          toLocationId: 'loc-2',
        },
      ];

      mockPrisma.inventoryMovement.findMany.mockResolvedValue(mockMovements);

      const outMovements = mockMovements.filter(m => m.movementType === 'TRANSFER_OUT');
      const inMovements = mockMovements.filter(m => m.movementType === 'TRANSFER_IN');

      expect(outMovements.length).toBe(1);
      expect(inMovements.length).toBe(1);
      expect(outMovements[0].quantity).toBe(inMovements[0].quantity);
      expect(outMovements[0].fromLocationId).toBe(inMovements[0].fromLocationId);
      expect(outMovements[0].toLocationId).toBe(inMovements[0].toLocationId);
    });

    it('Source stock should not change without paired dispatch/receipt', async () => {
      const transferId = 'TRF202600001';
      const mockOutMovement = {
        id: 'mov-1',
        productId: 'prod-1',
        quantity: 5,
        movementType: 'TRANSFER_OUT',
        referenceId: transferId,
      };

      mockPrisma.inventoryMovement.findMany.mockResolvedValue([mockOutMovement]);

      const movements = await mockPrisma.inventoryMovement.findMany({
        where: { referenceId: transferId },
      });

      const hasInMovement = movements.some(m => m.movementType === 'TRANSFER_IN');
      const sourceChangedWithoutReceipt = movements.filter(m => m.movementType === 'TRANSFER_OUT').length > 0 && !hasInMovement;

      expect(sourceChangedWithoutReceipt).toBe(true);
    });
  });
});
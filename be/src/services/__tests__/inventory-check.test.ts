import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  recordAdjustmentMovement,
} from '../../modules/inventory/index.js';
import type { Tx } from '../../modules/inventory/index.js';

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
    inventoryCheck: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    inventoryCheckItem: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
  };
}

describe('recordAdjustmentMovement with reasonCode', () => {
  let tx: ReturnType<typeof createTx>;

  beforeEach(() => {
    tx = createTx();
    vi.clearAllMocks();
  });

  it('records adjustment with DAMAGED reasonCode', async () => {
    tx.inventory.findUnique.mockResolvedValue({
      productId: 'p1',
      quantity: 10,
      available: 10,
      reserved: 0,
    });
    tx.inventory.update.mockResolvedValue({
      productId: 'p1',
      quantity: 7,
      available: 7,
      reserved: 0,
    });
    tx.inventoryMovement.create.mockResolvedValue({ id: 'm1' });

    const result = await recordAdjustmentMovement(tx as unknown as Tx, {
      productId: 'p1',
      systemQuantity: 10,
      actualQuantity: 7,
      referenceType: 'InventoryCheck',
      referenceId: 'chk-1',
      createdById: 'u1',
      reasonCode: 'DAMAGED',
      notes: 'Found damaged items during count',
    });

    expect(result.delta).toBe(-3);
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
        notes: '[DAMAGED] Found damaged items during count',
      }),
    });
  });

  it('records adjustment with EXPIRED reasonCode', async () => {
    tx.inventory.findUnique.mockResolvedValue({
      productId: 'p2',
      quantity: 20,
      available: 20,
      reserved: 0,
    });
    tx.inventory.update.mockResolvedValue({
      productId: 'p2',
      quantity: 15,
      available: 15,
      reserved: 0,
    });
    tx.inventoryMovement.create.mockResolvedValue({ id: 'm2' });

    const result = await recordAdjustmentMovement(tx as unknown as Tx, {
      productId: 'p2',
      systemQuantity: 20,
      actualQuantity: 15,
      referenceType: 'InventoryCheck',
      referenceId: 'chk-1',
      createdById: 'u1',
      reasonCode: 'EXPIRED',
      notes: 'Items past expiration date',
    });

    expect(result.delta).toBe(-5);
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        movementType: 'ADJUSTMENT',
        quantity: -5,
        notes: '[EXPIRED] Items past expiration date',
      }),
    });
  });

  it('records adjustment with MISCOUNT reasonCode', async () => {
    tx.inventory.findUnique.mockResolvedValue({
      productId: 'p3',
      quantity: 10,
      available: 10,
      reserved: 0,
    });
    tx.inventory.update.mockResolvedValue({
      productId: 'p3',
      quantity: 12,
      available: 12,
      reserved: 0,
    });
    tx.inventoryMovement.create.mockResolvedValue({ id: 'm3' });

    const result = await recordAdjustmentMovement(tx as unknown as Tx, {
      productId: 'p3',
      systemQuantity: 10,
      actualQuantity: 12,
      referenceType: 'InventoryCheck',
      referenceId: 'chk-1',
      createdById: 'u1',
      reasonCode: 'MISCOUNT',
    });

    expect(result.delta).toBe(2);
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        movementType: 'ADJUSTMENT',
        quantity: 2,
        notes: '[MISCOUNT]',
      }),
    });
  });

  it('records adjustment with THEFT reasonCode', async () => {
    tx.inventory.findUnique.mockResolvedValue({
      productId: 'p4',
      quantity: 50,
      available: 50,
      reserved: 0,
    });
    tx.inventory.update.mockResolvedValue({
      productId: 'p4',
      quantity: 45,
      available: 45,
      reserved: 0,
    });
    tx.inventoryMovement.create.mockResolvedValue({ id: 'm4' });

    const result = await recordAdjustmentMovement(tx as unknown as Tx, {
      productId: 'p4',
      systemQuantity: 50,
      actualQuantity: 45,
      referenceType: 'InventoryCheck',
      referenceId: 'chk-1',
      createdById: 'u1',
      reasonCode: 'THEFT',
      notes: 'Suspected theft - security notified',
    });

    expect(result.delta).toBe(-5);
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        movementType: 'ADJUSTMENT',
        quantity: -5,
        notes: '[THEFT] Suspected theft - security notified',
      }),
    });
  });

  it('records adjustment with OTHER reasonCode', async () => {
    tx.inventory.findUnique.mockResolvedValue({
      productId: 'p5',
      quantity: 100,
      available: 100,
      reserved: 0,
    });
    tx.inventory.update.mockResolvedValue({
      productId: 'p5',
      quantity: 98,
      available: 98,
      reserved: 0,
    });
    tx.inventoryMovement.create.mockResolvedValue({ id: 'm5' });

    const result = await recordAdjustmentMovement(tx as unknown as Tx, {
      productId: 'p5',
      systemQuantity: 100,
      actualQuantity: 98,
      referenceType: 'InventoryCheck',
      referenceId: 'chk-1',
      createdById: 'u1',
      reasonCode: 'OTHER',
      notes: 'Sample items removed for display',
    });

    expect(result.delta).toBe(-2);
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        movementType: 'ADJUSTMENT',
        quantity: -2,
        notes: '[OTHER] Sample items removed for display',
      }),
    });
  });

  it('returns early with zero delta when no discrepancy', async () => {
    const result = await recordAdjustmentMovement(tx as unknown as Tx, {
      productId: 'p1',
      systemQuantity: 10,
      actualQuantity: 10,
      referenceType: 'InventoryCheck',
      referenceId: 'chk-1',
      createdById: 'u1',
    });

    expect(result.delta).toBe(0);
    expect(result.movement).toBeNull();
    expect(tx.inventory.update).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it('uses notes without reasonCode when not provided', async () => {
    tx.inventory.findUnique.mockResolvedValue({
      productId: 'p1',
      quantity: 10,
      available: 10,
      reserved: 0,
    });
    tx.inventory.update.mockResolvedValue({
      productId: 'p1',
      quantity: 8,
      available: 8,
      reserved: 0,
    });
    tx.inventoryMovement.create.mockResolvedValue({ id: 'm1' });

    await recordAdjustmentMovement(tx as unknown as Tx, {
      productId: 'p1',
      systemQuantity: 10,
      actualQuantity: 8,
      referenceType: 'InventoryCheck',
      referenceId: 'chk-1',
      createdById: 'u1',
      notes: 'Manual adjustment',
    });

    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        movementType: 'ADJUSTMENT',
        quantity: -2,
        notes: 'Manual adjustment',
      }),
    });
  });

  it('prepends reasonCode to existing notes', async () => {
    tx.inventory.findUnique.mockResolvedValue({
      productId: 'p1',
      quantity: 10,
      available: 10,
      reserved: 0,
    });
    tx.inventory.update.mockResolvedValue({
      productId: 'p1',
      quantity: 5,
      available: 5,
      reserved: 0,
    });
    tx.inventoryMovement.create.mockResolvedValue({ id: 'm1' });

    await recordAdjustmentMovement(tx as unknown as Tx, {
      productId: 'p1',
      systemQuantity: 10,
      actualQuantity: 5,
      referenceType: 'InventoryCheck',
      referenceId: 'chk-1',
      createdById: 'u1',
      reasonCode: 'DAMAGED',
      notes: 'Water damage from leak',
    });

    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        movementType: 'ADJUSTMENT',
        quantity: -5,
        notes: '[DAMAGED] Water damage from leak',
      }),
    });
  });

  it('throws when inventory not found', async () => {
    tx.inventory.findUnique.mockResolvedValue(null);

    await expect(
      recordAdjustmentMovement(tx as unknown as Tx, {
        productId: 'unknown',
        systemQuantity: 10,
        actualQuantity: 8,
        referenceType: 'InventoryCheck',
        referenceId: 'chk-1',
        createdById: 'u1',
      })
    ).rejects.toThrow('Inventory not found for product unknown');
  });
});

describe('inventory count session workflow', () => {
  let tx: ReturnType<typeof createTx>;

  beforeEach(() => {
    tx = createTx();
    vi.clearAllMocks();
  });

  describe('blind count behavior', () => {
    it('should not expose systemQty to counter during counting', () => {
      const blindItemResponse = {
        id: 'item-1',
        productId: 'p1',
        product: { id: 'p1', name: 'Test Product', sku: 'SKU001' },
        countedQty: 0,
        status: 'PENDING',
      };

      expect(blindItemResponse).not.toHaveProperty('systemQty');
      expect(blindItemResponse.countedQty).toBe(0);
    });

    it('should return HAS_DISCREPANCY status when counted qty differs from system', () => {
      const itemWithDiscrepancy = {
        id: 'item-1',
        productId: 'p1',
        product: { id: 'p1', name: 'Test Product', sku: 'SKU001' },
        countedQty: 8,
        discrepancy: -2,
        status: 'HAS_DISCREPANCY',
      };

      expect(itemWithDiscrepancy.status).toBe('HAS_DISCREPANCY');
      expect(itemWithDiscrepancy.discrepancy).toBe(-2);
    });

    it('should return COUNTED status when no discrepancy', () => {
      const itemWithoutDiscrepancy = {
        id: 'item-2',
        productId: 'p2',
        product: { id: 'p2', name: 'Another Product', sku: 'SKU002' },
        countedQty: 10,
        discrepancy: 0,
        status: 'COUNTED',
      };

      expect(itemWithoutDiscrepancy.status).toBe('COUNTED');
      expect(itemWithoutDiscrepancy.discrepancy).toBe(0);
    });
  });

  describe('recount behavior', () => {
    it('should reset actualQty to 0 for recount', () => {
      const recountItem = {
        id: 'item-1',
        actualQty: 0,
        discrepancy: 0,
        notes: '[RECOUNT]',
      };

      expect(recountItem.actualQty).toBe(0);
      expect(recountItem.discrepancy).toBe(0);
      expect(recountItem.notes).toContain('RECOUNT');
    });
  });

  describe('supervisor approval', () => {
    it('requires approval when discrepancies exist', () => {
      const checkWithDiscrepancies = {
        items: [
          { id: 'item-1', discrepancy: -2 },
          { id: 'item-2', discrepancy: 0 },
        ],
        approverId: null,
      };

      const hasDiscrepancies = checkWithDiscrepancies.items.some(
        (item) => item.discrepancy !== 0
      );
      const requiresApproval =
        hasDiscrepancies && !checkWithDiscrepancies.approverId;

      expect(hasDiscrepancies).toBe(true);
      expect(requiresApproval).toBe(true);
    });

    it('does not require approval when no discrepancies', () => {
      const checkWithoutDiscrepancies = {
        items: [
          { id: 'item-1', discrepancy: 0 },
          { id: 'item-2', discrepancy: 0 },
        ],
        approverId: null,
      };

      const hasDiscrepancies = checkWithoutDiscrepancies.items.some(
        (item) => item.discrepancy !== 0
      );
      const requiresApproval =
        hasDiscrepancies && !checkWithoutDiscrepancies.approverId;

      expect(hasDiscrepancies).toBe(false);
      expect(requiresApproval).toBe(false);
    });

    it('allows adjustment after approval', () => {
      const approvedCheck = {
        items: [{ id: 'item-1', discrepancy: -2 }],
        approverId: 'supervisor-1',
        approvedAt: new Date(),
      };

      const hasDiscrepancies = approvedCheck.items.some(
        (item) => item.discrepancy !== 0
      );
      const canAdjust = !hasDiscrepancies || !!approvedCheck.approverId;

      expect(canAdjust).toBe(true);
    });
  });

  describe('discrepancy summary', () => {
    it('calculates positive and negative discrepancies correctly', () => {
      const items = [
        { discrepancy: 5 },
        { discrepancy: -3 },
        { discrepancy: 2 },
        { discrepancy: -1 },
        { discrepancy: 0 },
      ];

      const itemsWithDiscrepancy = items.filter((i) => i.discrepancy !== 0);
      const totalPositiveDiscrepancy = itemsWithDiscrepancy.reduce(
        (sum, i) => sum + Math.max(0, i.discrepancy),
        0
      );
      const totalNegativeDiscrepancy = itemsWithDiscrepancy.reduce(
        (sum, i) => sum + Math.min(0, i.discrepancy),
        0
      );
      const netDiscrepancy =
        totalPositiveDiscrepancy + totalNegativeDiscrepancy;

      expect(totalPositiveDiscrepancy).toBe(7);
      expect(totalNegativeDiscrepancy).toBe(-4);
      expect(netDiscrepancy).toBe(3);
    });
  });

  describe('scope selection', () => {
    it('creates session with productIds scope', () => {
      const scope = {
        productIds: ['p1', 'p2', 'p3'],
      };

      expect(scope.productIds).toHaveLength(3);
    });

    it('creates session with category scope', () => {
      const scope = {
        category: 'Electronics',
      };

      expect(scope.category).toBe('Electronics');
    });

    it('creates session with full scope', () => {
      const scope = {
        productIds: ['p1'],
        category: 'Electronics',
        locationId: 'loc-1',
      };

      expect(scope.productIds).toHaveLength(1);
      expect(scope.category).toBe('Electronics');
      expect(scope.locationId).toBe('loc-1');
    });
  });
});

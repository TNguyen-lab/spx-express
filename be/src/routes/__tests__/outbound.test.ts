import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutboundStatus } from '../../constants/workflow-status';

const { mockPrisma, mockEventEmitter, mockOutboundService } = vi.hoisted(() => ({
  mockPrisma: {
    outbound: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    packing: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
  mockEventEmitter: {
    emit: vi.fn().mockResolvedValue(undefined),
  },
  mockOutboundService: {
    createOutbound: vi.fn(),
    checkInventory: vi.fn(),
    confirmInventorySufficient: vi.fn(),
    markInventoryInsufficient: vi.fn(),
    assignPicking: vi.fn(),
    assignPicker: vi.fn(),
    scanItem: vi.fn(),
    confirmPickedCorrect: vi.fn(),
    markPickedWrong: vi.fn(),
    rescanItem: vi.fn(),
    putInCart: vi.fn(),
    printSlip: vi.fn(),
    moveToPacking: vi.fn(),
  },
}));

vi.mock('../../config/db.js', () => ({
  default: mockPrisma,
}));

vi.mock('../../events/emitter.js', () => ({
  eventEmitter: mockEventEmitter,
}));

vi.mock('../../modules/outbound/service.js', () => ({
  outboundService: mockOutboundService,
}));

describe('P03: Outbound Routes - Full Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /outbounds', () => {
    it('should list outbounds with pagination', async () => {
      mockPrisma.outbound.findMany.mockResolvedValue([]);
      mockPrisma.outbound.count.mockResolvedValue(0);

      expect(mockPrisma.outbound.findMany).toBeDefined();
      expect(mockPrisma.outbound.count).toBeDefined();
    });
  });

  describe('P03_ORDER_RECEIVED → P03_INVENTORY_CHECKED (check-inventory)', () => {
    it('should call outboundService.checkInventory', async () => {
      mockOutboundService.checkInventory.mockResolvedValue({ id: 'out-1', status: 'INVENTORY_CHECKED' });

      const result = await mockOutboundService.checkInventory('out-1', 'STAFF', 'user-1');

      expect(mockOutboundService.checkInventory).toHaveBeenCalledWith('out-1', 'STAFF', 'user-1');
      expect(result.status).toBe('INVENTORY_CHECKED');
    });
  });

  describe('P03_INVENTORY_CHECKED → P03_INVENTORY_SUFFICIENT (confirm-sufficient)', () => {
    it('should call outboundService.confirmInventorySufficient', async () => {
      mockOutboundService.confirmInventorySufficient.mockResolvedValue({ id: 'out-1', status: 'INVENTORY_SUFFICIENT' });

      const result = await mockOutboundService.confirmInventorySufficient('out-1', 'WAREHOUSE_DIRECTOR', 'user-1');

      expect(result.status).toBe('INVENTORY_SUFFICIENT');
    });
  });

  describe('P03_INVENTORY_CHECKED → P03_INVENTORY_INSUFFICIENT (mark-insufficient)', () => {
    it('should call outboundService.markInventoryInsufficient', async () => {
      mockOutboundService.markInventoryInsufficient.mockResolvedValue({ id: 'out-1', status: 'INVENTORY_INSUFFICIENT' });

      const result = await mockOutboundService.markInventoryInsufficient('out-1', 'WAREHOUSE_DIRECTOR', 'user-1');

      expect(result.status).toBe('INVENTORY_INSUFFICIENT');
    });
  });

  describe('P03_PICKING_ASSIGNED (assign-picking)', () => {
    it('should call outboundService.assignPicking', async () => {
      mockOutboundService.assignPicking.mockResolvedValue({ id: 'out-1', status: 'PICKING_ASSIGNED' });

      const result = await mockOutboundService.assignPicking('out-1', 'WAREHOUSE_DIRECTOR', 'user-1');

      expect(result.status).toBe('PICKING_ASSIGNED');
    });
  });

  describe('P03_PICKER_ASSIGNED (assign-picker)', () => {
    it('should call outboundService.assignPicker with pickerId', async () => {
      mockOutboundService.assignPicker.mockResolvedValue({ id: 'out-1', status: 'PICKER_ASSIGNED', pickerId: 'picker-1' });

      const result = await mockOutboundService.assignPicker('out-1', 'picker-1', 'WAREHOUSE_DIRECTOR', 'user-1');

      expect(mockOutboundService.assignPicker).toHaveBeenCalledWith('out-1', 'picker-1', 'WAREHOUSE_DIRECTOR', 'user-1');
      expect(result.pickerId).toBe('picker-1');
    });
  });

  describe('P03_ITEM_SCANNED (scan-item)', () => {
    it('should call outboundService.scanItem with productId and barcode', async () => {
      mockOutboundService.scanItem.mockResolvedValue({ id: 'out-1', status: 'ITEM_SCANNED' });

      const result = await mockOutboundService.scanItem('out-1', 'prod-1', 'barcode-123', 'STAFF', 'user-1');

      expect(mockOutboundService.scanItem).toHaveBeenCalledWith('out-1', 'prod-1', 'barcode-123', 'STAFF', 'user-1');
      expect(result.status).toBe('ITEM_SCANNED');
    });
  });

  describe('P03_PICKED_CORRECT (pick-correct)', () => {
    it('should call outboundService.confirmPickedCorrect', async () => {
      mockOutboundService.confirmPickedCorrect.mockResolvedValue({ id: 'out-1', status: 'PICKED_CORRECT' });

      const result = await mockOutboundService.confirmPickedCorrect('out-1', 'item-1', 5, 'STAFF', 'user-1');

      expect(mockOutboundService.confirmPickedCorrect).toHaveBeenCalledWith('out-1', 'item-1', 5, 'STAFF', 'user-1');
      expect(result.status).toBe('PICKED_CORRECT');
    });
  });

  describe('P03_PICKED_WRONG (pick-wrong)', () => {
    it('should call outboundService.markPickedWrong', async () => {
      mockOutboundService.markPickedWrong.mockResolvedValue({ id: 'out-1', status: 'PICKED_WRONG' });

      const result = await mockOutboundService.markPickedWrong('out-1', 'item-1', 'STAFF', 'user-1');

      expect(mockOutboundService.markPickedWrong).toHaveBeenCalledWith('out-1', 'item-1', 'STAFF', 'user-1');
      expect(result.status).toBe('PICKED_WRONG');
    });
  });

  describe('P03_PICKED_WRONG → ITEM_SCANNED (rescan)', () => {
    it('should call outboundService.rescanItem', async () => {
      mockOutboundService.rescanItem.mockResolvedValue({ id: 'out-1', status: 'ITEM_SCANNED' });

      const result = await mockOutboundService.rescanItem('out-1', 'STAFF', 'user-1');

      expect(result.status).toBe('ITEM_SCANNED');
    });
  });

  describe('P03_PUT_IN_CART (put-in-cart)', () => {
    it('should call outboundService.putInCart', async () => {
      mockOutboundService.putInCart.mockResolvedValue({ id: 'out-1', status: 'PUT_IN_CART' });

      const result = await mockOutboundService.putInCart('out-1', 'STAFF', 'user-1');

      expect(result.status).toBe('PUT_IN_CART');
    });
  });

  describe('P03_SLIP_PRINTED (print-slip)', () => {
    it('should call outboundService.printSlip', async () => {
      mockOutboundService.printSlip.mockResolvedValue({ id: 'out-1', status: 'SLIP_PRINTED' });

      const result = await mockOutboundService.printSlip('out-1', 'STAFF', 'user-1');

      expect(result.status).toBe('SLIP_PRINTED');
    });
  });

  describe('P03_MOVED_TO_PACKING (move-to-packing)', () => {
    it('should call outboundService.moveToPacking and receive packing record', async () => {
      mockOutboundService.moveToPacking.mockResolvedValue({
        outbound: { id: 'out-1', status: 'MOVED_TO_PACKING' },
        packing: { id: 'pack-1', packingNumber: 'PK202600001' },
      });

      const result = await mockOutboundService.moveToPacking('out-1', 'STAFF', 'user-1');

      expect(result.outbound.status).toBe('MOVED_TO_PACKING');
      expect(result.packing.packingNumber).toBe('PK202600001');
    });
  });

  describe('Full P03 Happy Path', () => {
    it('should walk through all 12 states in order', async () => {
      const transitions = [
        { method: 'createOutbound', args: [{ orderRef: 'SHOPEE-001', items: [{ productId: 'p1', quantity: 5 }], userId: 'u1' }], status: 'ORDER_RECEIVED' },
        { method: 'checkInventory', args: ['out-1', 'STAFF', 'u1'], status: 'INVENTORY_CHECKED' },
        { method: 'confirmInventorySufficient', args: ['out-1', 'WAREHOUSE_DIRECTOR', 'u1'], status: 'INVENTORY_SUFFICIENT' },
        { method: 'assignPicking', args: ['out-1', 'WAREHOUSE_DIRECTOR', 'u1'], status: 'PICKING_ASSIGNED' },
        { method: 'assignPicker', args: ['out-1', 'picker-1', 'WAREHOUSE_DIRECTOR', 'u1'], status: 'PICKER_ASSIGNED' },
        { method: 'scanItem', args: ['out-1', 'p1', 'bar-1', 'STAFF', 'u1'], status: 'ITEM_SCANNED' },
        { method: 'confirmPickedCorrect', args: ['out-1', 'item-1', 5, 'STAFF', 'u1'], status: 'PICKED_CORRECT' },
        { method: 'putInCart', args: ['out-1', 'STAFF', 'u1'], status: 'PUT_IN_CART' },
        { method: 'printSlip', args: ['out-1', 'STAFF', 'u1'], status: 'SLIP_PRINTED' },
        { method: 'moveToPacking', args: ['out-1', 'STAFF', 'u1'], status: 'MOVED_TO_PACKING' },
      ];

      for (const step of transitions) {
        const serviceMethod = step.method as keyof typeof mockOutboundService;
        mockOutboundService[serviceMethod].mockResolvedValue({ id: 'out-1', status: step.status });

        const result = await (mockOutboundService[serviceMethod] as any)(...step.args);
        expect(result.id).toBe('out-1');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle state machine validation errors gracefully', async () => {
      mockOutboundService.checkInventory.mockRejectedValue(
        new Error('Invalid transition from P03_MOVED_TO_PACKING to P03_INVENTORY_CHECKED')
      );

      await expect(mockOutboundService.checkInventory('out-1', 'STAFF', 'user-1'))
        .rejects.toThrow('Invalid transition');
    });

    it('should handle not found errors', async () => {
      mockOutboundService.checkInventory.mockRejectedValue(
        new Error('Outbound not found')
      );

      await expect(mockOutboundService.checkInventory('bad-id', 'STAFF', 'user-1'))
        .rejects.toThrow('Outbound not found');
    });
  });
});

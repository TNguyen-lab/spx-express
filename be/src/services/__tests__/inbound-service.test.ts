import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InboundStatus } from '../../constants/canonical-status';
import { recordInboundMovement, generatePhieuNhapKho } from '../../modules/inventory/index.js';
import {
  createInbound,
  receiveItems,
  startQualityCheck,
  passQC,
  failQC,
  recheckAfterFailure,
  createBarcodes,
  assignLocation,
  autoAssignLocations,
  confirmReceipt,
  completeInbound,
  cancelInbound,
} from '../../modules/inbound/index.js';

vi.mock('../../modules/inventory/index.js', () => ({
  recordInboundMovement: vi.fn().mockResolvedValue(undefined),
  generatePhieuNhapKho: vi.fn().mockResolvedValue({ id: 'phieu-1', phieuNumber: 'PNK202600001' }),
}));

const { mockPrisma, mockEventEmitter, mockStateMachine } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn().mockImplementation(async (callback) => callback({
      inbound: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      inboundItem: {
        update: vi.fn(),
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
      inventory: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      inventoryMovement: {
        create: vi.fn(),
      },
      warehouseLocation: {
        findMany: vi.fn(),
      },
      phieuNhapKho: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: 'phieu-1', phieuNumber: 'PNK202600001' }),
      },
    })),
    inbound: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    inboundItem: {
      update: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    inventory: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    inventoryMovement: {
      create: vi.fn(),
    },
    warehouseLocation: {
      findMany: vi.fn(),
    },
  },
  mockEventEmitter: {
    emit: vi.fn().mockResolvedValue(undefined),
  },
  mockStateMachine: {
    validateTransition: vi.fn(),
  },
}));

vi.mock('../../config/db.js', () => ({
  default: mockPrisma,
}));

vi.mock('../../events/emitter.js', () => ({
  eventEmitter: mockEventEmitter,
}));

vi.mock('../../modules/inbound/domain/aggregates/inbound-policy.js', () => mockStateMachine);

const inboundService = {
  createInbound,
  receiveItems,
  startQualityCheck,
  passQC,
  failQC,
  recheckAfterFailure,
  createBarcodes,
  assignLocation,
  autoAssignLocations,
  confirmReceipt,
  completeInbound,
  cancelInbound,
};

describe('inbound-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInbound', () => {
    it('should create an inbound order in INBOUND_CREATED status and emit event', async () => {
      mockPrisma.inbound.count.mockResolvedValue(0);
      mockPrisma.inbound.create.mockResolvedValue({
        id: 'ib-1',
        inboundNumber: 'IN202600001',
        status: 'INBOUND_CREATED',
        items: [{ productId: 'p1', quantity: 10 }],
      });

      const result = await inboundService.createInbound({
        purchaseOrderId: 'po-1',
        notes: 'test inbound',
        items: [{ productId: 'p1', quantity: 10 }],
        userId: 'u1',
      });

      expect(mockPrisma.inbound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'INBOUND_CREATED',
            purchaseOrderId: 'po-1',
            staffId: 'u1',
            notes: 'test inbound',
          }),
        })
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'INBOUND_CREATED',
        'Inbound',
        'ib-1',
        expect.objectContaining({ inboundNumber: 'IN202600001' }),
        'u1'
      );
      expect(result.status).toBe('INBOUND_CREATED');
    });
  });

  describe('receiveItems', () => {
    it('should transition from INBOUND_CREATED to ITEMS_RECEIVED with STAFF role', async () => {
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ib-1',
            inboundNumber: 'IN202600001',
            status: 'INBOUND_CREATED',
          }),
          update: vi.fn().mockResolvedValue({
            id: 'ib-1',
            status: 'ITEMS_RECEIVED',
            receivedDate: expect.any(Date),
          }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      const result = await inboundService.receiveItems('ib-1', 'STAFF', 'u1');

      expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
        InboundStatus.INBOUND_CREATED,
        InboundStatus.ITEMS_RECEIVED,
        'STAFF'
      );
      expect(mockTx.inbound.update).toHaveBeenCalledWith({
        where: { id: 'ib-1' },
        data: { status: 'ITEMS_RECEIVED', receivedDate: expect.any(Date) },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'INBOUND_ITEMS_RECEIVED',
        'Inbound',
        'ib-1',
        expect.any(Object),
        'u1',
        mockTx
      );
    });
  });

  describe('startQualityCheck', () => {
    it('should transition from ITEMS_RECEIVED to QUALITY_CHECKING with QUALITY role', async () => {
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ib-1',
            inboundNumber: 'IN202600001',
            status: 'ITEMS_RECEIVED',
          }),
          update: vi.fn().mockResolvedValue({
            id: 'ib-1',
            status: 'QUALITY_CHECKING',
          }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      await inboundService.startQualityCheck('ib-1', 'QUALITY', 'u2');

      expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
        InboundStatus.ITEMS_RECEIVED,
        InboundStatus.QUALITY_CHECKING,
        'QUALITY'
      );
      expect(mockTx.inbound.update).toHaveBeenCalledWith({
        where: { id: 'ib-1' },
        data: { status: 'QUALITY_CHECKING' },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'INBOUND_QUALITY_CHECKING',
        'Inbound',
        'ib-1',
        expect.any(Object),
        'u2',
        mockTx
      );
    });
  });

  describe('passQC', () => {
    it('should transition from QUALITY_CHECKING to QC_PASSED with QUALITY role and record inventory movements', async () => {
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ib-1',
            inboundNumber: 'IN202600001',
            status: 'QUALITY_CHECKING',
            items: [
              { id: 'item-1', productId: 'existing-product', receivedQty: 5, locationId: 'loc-1' },
            ],
          }),
          update: vi.fn().mockResolvedValue({
            id: 'ib-1',
            status: 'QC_PASSED',
          }),
        },
        inboundItem: {
          update: vi.fn().mockResolvedValue({ id: 'item-1' }),
        },
        phieuNhapKho: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({ id: 'phieu-1', phieuNumber: 'PNK202600001' }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      const result = await inboundService.passQC('ib-1', 'QUALITY', 'u2');

      expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
        InboundStatus.QUALITY_CHECKING,
        InboundStatus.QC_PASSED,
        'QUALITY'
      );
      expect(mockTx.inbound.update).toHaveBeenCalledWith({
        where: { id: 'ib-1' },
        data: { status: 'QC_PASSED', qcPassedDate: expect.any(Date) },
      });
      expect(recordInboundMovement).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          productId: 'existing-product',
          quantity: 5,
          referenceType: 'Inbound',
          referenceId: 'ib-1',
        })
      );
      expect(generatePhieuNhapKho).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          inboundId: 'ib-1',
          inboundNumber: 'IN202600001',
          createdById: 'u2',
        })
      );
      expect(result).toHaveProperty('phieu');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'INBOUND_QC_PASSED',
        'Inbound',
        'ib-1',
        expect.objectContaining({ inboundNumber: 'IN202600001', passed: true, phieuNumber: 'PNK202600001' }),
        'u2',
        mockTx
      );
    });

    it('should pass itemUpdates to update quantities before recording movements', async () => {
      let updatedQty = 5;
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockImplementation(() => Promise.resolve({
            id: 'ib-1',
            inboundNumber: 'IN202600001',
            status: 'QUALITY_CHECKING',
            items: [
              { id: 'item-1', productId: 'existing-product', receivedQty: updatedQty, locationId: 'loc-1' },
            ],
          })),
          update: vi.fn().mockResolvedValue({
            id: 'ib-1',
            status: 'QC_PASSED',
          }),
        },
        inboundItem: {
          update: vi.fn().mockImplementation(async ({ data }) => {
            if (data?.receivedQty !== undefined) updatedQty = data.receivedQty;
            return { id: 'item-1' };
          }),
        },
        phieuNhapKho: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({ id: 'phieu-1', phieuNumber: 'PNK202600001' }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      const itemUpdates = [{ id: 'item-1', receivedQty: 4, damageQty: 1 }];

      await inboundService.passQC('ib-1', 'QUALITY', 'u2', itemUpdates);

      expect(mockTx.inboundItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { receivedQty: 4, damageQty: 1 },
      });
      expect(recordInboundMovement).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          productId: 'existing-product',
          quantity: 4,
        })
      );
      expect(generatePhieuNhapKho).toHaveBeenCalled();
    });

    it('should not record movement for items with receivedQty 0', async () => {
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ib-1',
            inboundNumber: 'IN202600001',
            status: 'QUALITY_CHECKING',
            items: [
              { id: 'item-1', productId: 'existing-product', receivedQty: 0, locationId: 'loc-1' },
            ],
          }),
          update: vi.fn().mockResolvedValue({
            id: 'ib-1',
            status: 'QC_PASSED',
          }),
        },
        inboundItem: {
          update: vi.fn().mockResolvedValue({ id: 'item-1' }),
        },
        phieuNhapKho: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({ id: 'phieu-1', phieuNumber: 'PNK202600001' }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      await inboundService.passQC('ib-1', 'QUALITY', 'u2');

      expect(recordInboundMovement).not.toHaveBeenCalled();
    });
  });

  describe('failQC', () => {
    it('should transition from QUALITY_CHECKING to QC_FAILED with QUALITY role', async () => {
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ib-1',
            inboundNumber: 'IN202600001',
            status: 'QUALITY_CHECKING',
          }),
          update: vi.fn().mockResolvedValue({
            id: 'ib-1',
            status: 'QC_FAILED',
          }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      await inboundService.failQC('ib-1', 'QUALITY', 'u2', 'Damaged packaging');

      expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
        InboundStatus.QUALITY_CHECKING,
        InboundStatus.QC_FAILED,
        'QUALITY'
      );
      expect(mockTx.inbound.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ib-1' },
          data: expect.objectContaining({ status: 'QC_FAILED' }),
        })
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'INBOUND_QC_FAILED',
        'Inbound',
        'ib-1',
        expect.objectContaining({ reason: 'Damaged packaging' }),
        'u2',
        mockTx
      );
    });
  });

  describe('recheckAfterFailure', () => {
    it('should transition from QC_FAILED back to QUALITY_CHECKING with QUALITY role', async () => {
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ib-1',
            inboundNumber: 'IN202600001',
            status: 'QC_FAILED',
          }),
          update: vi.fn().mockResolvedValue({
            id: 'ib-1',
            status: 'QUALITY_CHECKING',
          }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      await inboundService.recheckAfterFailure('ib-1', 'QUALITY', 'u2');

      expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
        InboundStatus.QC_FAILED,
        InboundStatus.QUALITY_CHECKING,
        'QUALITY'
      );
      expect(mockTx.inbound.update).toHaveBeenCalledWith({
        where: { id: 'ib-1' },
        data: { status: 'QUALITY_CHECKING' },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'INBOUND_QUALITY_CHECKING',
        'Inbound',
        'ib-1',
        expect.objectContaining({ recheck: true }),
        'u2',
        mockTx
      );
    });
  });

  describe('createBarcodes', () => {
    it('should transition from QC_PASSED to BARCODE_CREATED with STAFF role', async () => {
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ib-1',
            inboundNumber: 'IN202600001',
            status: 'QC_PASSED',
            items: [{ id: 'item-1' }, { id: 'item-2' }],
          }),
          update: vi.fn().mockResolvedValue({
            id: 'ib-1',
            status: 'BARCODE_CREATED',
          }),
        },
        inboundItem: {
          update: vi.fn().mockResolvedValue({ id: 'item-1' }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      await inboundService.createBarcodes('ib-1', 'STAFF', 'u3');

      expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
        InboundStatus.QC_PASSED,
        InboundStatus.BARCODE_CREATED,
        'STAFF'
      );
      expect(mockTx.inbound.update).toHaveBeenCalledWith({
        where: { id: 'ib-1' },
        data: { status: 'BARCODE_CREATED' },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'INBOUND_BARCODE_CREATED',
        'Inbound',
        'ib-1',
        expect.any(Object),
        'u3',
        mockTx
      );
    });
  });

  describe('assignLocation', () => {
    it('should transition from BARCODE_CREATED to LOCATION_ASSIGNED with STAFF role', async () => {
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ib-1',
            inboundNumber: 'IN202600001',
            status: 'BARCODE_CREATED',
            items: [{ id: 'item-1' }],
          }),
          update: vi.fn().mockResolvedValue({
            id: 'ib-1',
            status: 'LOCATION_ASSIGNED',
          }),
        },
        inboundItem: {
          update: vi.fn().mockResolvedValue({ id: 'item-1' }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      await inboundService.assignLocation('ib-1', 'STAFF', 'u3', 'item-1', 'loc-1');

      expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
        InboundStatus.BARCODE_CREATED,
        InboundStatus.LOCATION_ASSIGNED,
        'STAFF'
      );
      expect(mockTx.inboundItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { locationId: 'loc-1' },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'INBOUND_LOCATION_ASSIGNED',
        'Inbound',
        'ib-1',
        expect.objectContaining({ locationId: 'loc-1' }),
        'u3',
        mockTx
      );
    });
  });

  describe('autoAssignLocations', () => {
    it('should throw error when no warehouse locations exist', async () => {
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ib-1',
            inboundNumber: 'IN202600001',
            status: 'BARCODE_CREATED',
            items: [{ id: 'item-1', locationId: null }],
          }),
          update: vi.fn().mockResolvedValue({ id: 'ib-1' }),
        },
        warehouseLocation: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        inboundItem: {
          groupBy: vi.fn().mockResolvedValue([]),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      await expect(
        inboundService.autoAssignLocations('ib-1', 'STAFF', 'u3')
      ).rejects.toThrow('No warehouse locations available');
    });

    it('should assign locations to items without locations', async () => {
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ib-1',
            inboundNumber: 'IN202600001',
            status: 'BARCODE_CREATED',
            items: [
              { id: 'item-1', locationId: null },
              { id: 'item-2', locationId: 'loc-1' },
            ],
          }),
          update: vi.fn().mockResolvedValue({ id: 'ib-1' }),
        },
        warehouseLocation: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'loc-2', zone: 'A', row: 1, shelf: 1 },
            { id: 'loc-3', zone: 'A', row: 1, shelf: 2 },
          ]),
        },
        inboundItem: {
          groupBy: vi.fn().mockResolvedValue([
            { locationId: 'loc-1', _count: { locationId: 1 } },
          ]),
          update: vi.fn().mockResolvedValue({ id: 'item-1' }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      await inboundService.autoAssignLocations('ib-1', 'STAFF', 'u3');

      expect(mockTx.inboundItem.update).toHaveBeenCalled();
      expect(mockTx.inbound.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ib-1' },
          data: { status: 'LOCATION_ASSIGNED' },
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw when inbound not found', async () => {
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      await expect(
        inboundService.receiveItems('not-found', 'STAFF', 'u1')
      ).rejects.toThrow('Inbound not found');
    });

    it('should propagate state machine validation errors', async () => {
      mockStateMachine.validateTransition.mockImplementation(() => {
        throw new Error('Invalid transition from INBOUND_COMPLETED to ITEMS_RECEIVED');
      });
      const mockTx = {
        inbound: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ib-1',
            inboundNumber: 'IN202600001',
            status: 'INBOUND_COMPLETED',
          }),
          update: vi.fn().mockResolvedValue({ id: 'ib-1' }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));

      await expect(
        inboundService.receiveItems('ib-1', 'STAFF', 'u1')
      ).rejects.toThrow('Invalid transition');
    });
  });
});

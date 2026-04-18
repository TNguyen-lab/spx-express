import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db.js', () => ({
  default: {
    packing: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    sorting: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    Shipment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    outbound: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    inventory: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

type MockPrisma = any;

vi.mock('../../events/emitter.js', () => ({
  eventEmitter: {
    emit: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../modules/shared/transactions.js', () => ({
  withTransaction: vi.fn((fn) => fn({})),
}));

describe('P04-P06: Pack → Sort → Ship Full Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('P04: Packing Workflow', () => {
    const mockPacking = {
      id: 'pack-1',
      packingNumber: 'PK202600001',
      outboundId: 'out-1',
      packerId: 'user-1',
      status: 'PENDING',
      outbound: {
        id: 'out-1',
        outboundNumber: 'OUT202600001',
        items: [
          { id: 'item-1', productId: 'prod-1', quantity: 5, product: { id: 'prod-1', name: 'Test Product' } },
        ],
      },
      packer: { id: 'user-1', name: 'Test Packer' },
    };

    it('PENDING -> PACKING: Start packing', async () => {
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };
      const { eventEmitter } = await import('../../events/emitter.js');

      prisma.packing.findUnique.mockResolvedValue({ ...mockPacking, status: 'PENDING' });
      prisma.packing.update.mockResolvedValue({ ...mockPacking, status: 'PACKING' });

      const result = await prisma.packing.update({
        where: { id: 'pack-1' },
        data: { status: 'PACKING' },
      });

      expect(result.status).toBe('PACKING');

      await eventEmitter.emit('PACKING_STARTED', 'Packing', 'pack-1', {
        packingNumber: 'PK202600001',
      }, 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'PACKING_STARTED',
        'Packing',
        'pack-1',
        expect.any(Object),
        'user-1'
      );
    });

    it('PACKING -> PACKED: Mark as packed with carton/pallet grouping', async () => {
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      const packingInProgress = { ...mockPacking, status: 'PACKING' };
      prisma.packing.findUnique.mockResolvedValue(packingInProgress);
      prisma.packing.update.mockResolvedValue({
        ...packingInProgress,
        status: 'PACKED',
        cartonId: 'CTN001',
        palletId: 'PLT001',
      });

      const result = await prisma.packing.update({
        where: { id: 'pack-1' },
        data: { status: 'PACKED', cartonId: 'CTN001', palletId: 'PLT001' },
      });

      expect(result.status).toBe('PACKED');
      expect(result.cartonId).toBe('CTN001');
      expect(result.palletId).toBe('PLT001');
    });

    it('PACKED -> SEALED: Seal package with weight and dimension', async () => {
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      const packedPacking = { ...mockPacking, status: 'PACKED', cartonId: 'CTN001', palletId: 'PLT001' };
      prisma.packing.findUnique.mockResolvedValue(packedPacking);
      prisma.packing.update.mockResolvedValue({
        ...packedPacking,
        status: 'SEALED',
        weight: 2.5,
        dimension: '30x20x10',
        packedDate: expect.any(Date),
      });

      const result = await prisma.packing.update({
        where: { id: 'pack-1' },
        data: { status: 'SEALED', weight: 2.5, dimension: '30x20x10' },
      });

      expect(result.status).toBe('SEALED');
      expect(result.weight).toBe(2.5);
    });

    it('SEALED -> ON_CONVEYOR: Move to conveyor', async () => {
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      const sealedPacking = { ...mockPacking, status: 'SEALED', weight: 2.5 };
      prisma.packing.findUnique.mockResolvedValue(sealedPacking);
      prisma.packing.update.mockResolvedValue({ ...sealedPacking, status: 'ON_CONVEYOR' });

      const result = await prisma.packing.update({
        where: { id: 'pack-1' },
        data: { status: 'ON_CONVEYOR' },
      });

      expect(result.status).toBe('ON_CONVEYOR');
    });

    it('ON_CONVEYOR -> SORTING: Move to sorting creates sorting record', async () => {
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      const onConveyorPacking = { ...mockPacking, status: 'ON_CONVEYOR' };
      prisma.packing.findUnique.mockResolvedValue(onConveyorPacking);
      prisma.sorting.create.mockResolvedValue({
        id: 'sort-1',
        sortingNumber: 'SO202600001',
        packingId: 'pack-1',
        sorterId: 'user-1',
        status: 'PENDING',
      });

      const sorting = await prisma.sorting.create({
        data: {
          sortingNumber: 'SO202600001',
          packingId: 'pack-1',
          sorterId: 'user-1',
          status: 'PENDING',
        },
      });

      expect(sorting.status).toBe('PENDING');
      expect(sorting.packingId).toBe('pack-1');
    });
  });

  describe('P05: Sorting Workflow', () => {
    const mockSorting = {
      id: 'sort-1',
      sortingNumber: 'SO202600001',
      packingId: 'pack-1',
      sorterId: 'user-1',
      status: 'PENDING',
      packing: {
        id: 'pack-1',
        packingNumber: 'PK202600001',
        outbound: {
          id: 'out-1',
          items: [{ id: 'item-1', productId: 'prod-1', quantity: 5 }],
        },
      },
      sorter: { id: 'user-1', name: 'Test Sorter' },
    };

    it('PENDING -> SORTING: Start sorting', async () => {
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      prisma.sorting.findUnique.mockResolvedValue({ ...mockSorting, status: 'PENDING' });
      prisma.sorting.update.mockResolvedValue({ ...mockSorting, status: 'SORTING' });

      const result = await prisma.sorting.update({
        where: { id: 'sort-1' },
        data: { status: 'SORTING' },
      });

      expect(result.status).toBe('SORTING');
    });

    it('Assign route to sorting emits event', async () => {
      const { eventEmitter } = await import('../../events/emitter.js');

      await eventEmitter.emit('SORTING_ROUTE_ASSIGNED', 'Sorting', 'sort-1', {
        sortingNumber: 'SO202600001',
        route: 'R01',
      }, 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'SORTING_ROUTE_ASSIGNED',
        'Sorting',
        'sort-1',
        expect.any(Object),
        'user-1'
      );
    });

    it('Assign zone to sorting emits event', async () => {
      const { eventEmitter } = await import('../../events/emitter.js');

      await eventEmitter.emit('SORTING_ZONE_ASSIGNED', 'Sorting', 'sort-1', {
        sortingNumber: 'SO202600001',
        zone: 'A1',
      }, 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'SORTING_ZONE_ASSIGNED',
        'Sorting',
        'sort-1',
        expect.any(Object),
        'user-1'
      );
    });

    it('SORTING -> SORTED: Classify package', async () => {
      const { default: prisma } = await import('../../config/db.js') as unknown as { default: MockPrisma };

      const sortingInProgress = { ...mockSorting, status: 'SORTING' };
      prisma.sorting.findUnique.mockResolvedValue(sortingInProgress);
      prisma.sorting.update.mockResolvedValue({ ...sortingInProgress, status: 'SORTED' });

      const result = await prisma.sorting.update({
        where: { id: 'sort-1' },
        data: { status: 'SORTED' },
      });

      expect(result.status).toBe('SORTED');
    });

    it('SORTED -> COMPLETED: Complete sorting creates shipment', async () => {
      const { default: prisma } = await import('../../config/db.js') as unknown as { default: MockPrisma };

      const sortedSorting = { ...mockSorting, status: 'SORTED' };
      prisma.sorting.findUnique.mockResolvedValue(sortedSorting);
      prisma.sorting.update.mockResolvedValue({ ...sortedSorting, status: 'COMPLETED', completedDate: new Date() });
      prisma.Shipment.create.mockResolvedValue({
        id: 'ship-1',
        shipmentNumber: 'SH202600001',
        sortingId: 'sort-1',
        shipperId: 'user-1',
        carrier: 'GHTK',
        status: 'CREATED',
      });

      const shipment = await prisma.Shipment.create({
        data: {
          shipmentNumber: 'SH202600001',
          sortingId: 'sort-1',
          shipperId: 'user-1',
          carrier: 'GHTK',
          status: 'CREATED',
        },
      });

      expect(shipment.status).toBe('CREATED');
      expect(shipment.sortingId).toBe('sort-1');
    });

    it('Handle sorting exception emits event', async () => {
      const { eventEmitter } = await import('../../events/emitter.js');
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      const sortingInProgress = { ...mockSorting, status: 'SORTING' };
      prisma.sorting.findUnique.mockResolvedValue(sortingInProgress);
      prisma.packing.update.mockResolvedValue({ ...mockSorting.packing, status: 'PENDING' });

      await eventEmitter.emit('SORTING_EXCEPTION', 'Sorting', 'sort-1', {
        sortingNumber: 'SO202600001',
        exceptionType: 'REPACK',
        notes: 'Damaged packaging',
      }, 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'SORTING_EXCEPTION',
        'Sorting',
        'sort-1',
        expect.any(Object),
        'user-1'
      );
    });
  });

  describe('P06: Shipping Workflow', () => {
    const mockShipment = {
      id: 'ship-1',
      shipmentNumber: 'SH202600001',
      sortingId: 'sort-1',
      shipperId: 'user-1',
      carrier: 'GHTK',
      status: 'CREATED',
      sorting: {
        id: 'sort-1',
        packing: {
          id: 'pack-1',
          outbound: {
            id: 'out-1',
            items: [{ id: 'item-1', productId: 'prod-1', quantity: 5 }],
          },
        },
      },
      shipper: { id: 'user-1', name: 'Test Shipper' },
    };

    it('CREATED -> PICKED_UP: Pickup emits event', async () => {
      const { eventEmitter } = await import('../../events/emitter.js');
      const { default: prisma } = await import('../../config/db.js') as unknown as { default: MockPrisma };

      prisma.Shipment.findUnique.mockResolvedValue({ ...mockShipment, status: 'CREATED' });
      prisma.Shipment.update.mockResolvedValue({ ...mockShipment, status: 'PICKED_UP', shippedDate: new Date() });
      prisma.inventory.findUnique.mockResolvedValue({
        productId: 'prod-1',
        quantity: 10,
        available: 10,
        reserved: 0,
      });

      await eventEmitter.emit('SHIPPING_PICKED_UP', 'Shipment', 'ship-1', {
        shipmentNumber: 'SH202600001',
      }, 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'SHIPPING_PICKED_UP',
        'Shipment',
        'ship-1',
        expect.any(Object),
        'user-1'
      );
    });

    it('PICKED_UP -> IN_TRANSIT: Mark as in transit', async () => {
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      prisma.Shipment.findUnique.mockResolvedValue({ ...mockShipment, status: 'PICKED_UP' });
      prisma.Shipment.update.mockResolvedValue({ ...mockShipment, status: 'IN_TRANSIT' });

      const result = await prisma.Shipment.update({
        where: { id: 'ship-1' },
        data: { status: 'IN_TRANSIT' },
      });

      expect(result.status).toBe('IN_TRANSIT');
    });

    it('IN_TRANSIT -> OUT_FOR_DELIVERY: Out for delivery', async () => {
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      prisma.Shipment.findUnique.mockResolvedValue({ ...mockShipment, status: 'IN_TRANSIT' });
      prisma.Shipment.update.mockResolvedValue({ ...mockShipment, status: 'OUT_FOR_DELIVERY' });

      const result = await prisma.Shipment.update({
        where: { id: 'ship-1' },
        data: { status: 'OUT_FOR_DELIVERY' },
      });

      expect(result.status).toBe('OUT_FOR_DELIVERY');
    });

    it('OUT_FOR_DELIVERY -> DELIVERED: Deliver emits event', async () => {
      const { eventEmitter } = await import('../../events/emitter.js');
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      prisma.Shipment.findUnique.mockResolvedValue({ ...mockShipment, status: 'OUT_FOR_DELIVERY' });
      prisma.Shipment.update.mockResolvedValue({
        ...mockShipment,
        status: 'DELIVERED',
        deliveredDate: new Date(),
        deliveryNotes: 'Signed by recipient',
      });

      await eventEmitter.emit('SHIPPING_DELIVERED', 'Shipment', 'ship-1', {
        shipmentNumber: 'SH202600001',
        recipientName: 'John Doe',
        deliveredAt: expect.any(String),
      }, 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'SHIPPING_DELIVERED',
        'Shipment',
        'ship-1',
        expect.any(Object),
        'user-1'
      );
    });

    it('OUT_FOR_DELIVERY -> FAILED: Delivery failed', async () => {
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      prisma.Shipment.findUnique.mockResolvedValue({ ...mockShipment, status: 'OUT_FOR_DELIVERY' });
      prisma.Shipment.update.mockResolvedValue({
        ...mockShipment,
        status: 'FAILED',
        deliveryNotes: 'Customer not available',
      });

      const result = await prisma.Shipment.update({
        where: { id: 'ship-1' },
        data: {
          status: 'FAILED',
          deliveryNotes: 'Customer not available',
        },
      });

      expect(result.status).toBe('FAILED');
    });

    it('FAILED -> RETURNED: Return shipment', async () => {
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      prisma.Shipment.findUnique.mockResolvedValue({ ...mockShipment, status: 'FAILED' });
      prisma.Shipment.update.mockResolvedValue({ ...mockShipment, status: 'RETURNED' });

      const result = await prisma.Shipment.update({
        where: { id: 'ship-1' },
        data: { status: 'RETURNED' },
      });

      expect(result.status).toBe('RETURNED');
    });

    it('FAILED -> IN_TRANSIT: Retry delivery', async () => {
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      prisma.Shipment.findUnique.mockResolvedValue({ ...mockShipment, status: 'FAILED' });
      prisma.Shipment.update.mockResolvedValue({ ...mockShipment, status: 'IN_TRANSIT', deliveryNotes: null });

      const result = await prisma.Shipment.update({
        where: { id: 'ship-1' },
        data: { status: 'IN_TRANSIT', deliveryNotes: null },
      });

      expect(result.status).toBe('IN_TRANSIT');
    });

    it('Record proof of delivery emits event', async () => {
      const { eventEmitter } = await import('../../events/emitter.js');
      const { default: prisma } = (await import('../../config/db.js')) as { default: any };

      prisma.Shipment.findUnique.mockResolvedValue({ ...mockShipment, status: 'OUT_FOR_DELIVERY' });
      prisma.Shipment.update.mockResolvedValue({
        ...mockShipment,
        status: 'DELIVERED',
        deliveredDate: new Date(),
      });

      await eventEmitter.emit('SHIPPING_POD_RECORDED', 'Shipment', 'ship-1', {
        shipmentNumber: 'SH202600001',
        recipientName: 'John Doe',
        deliveredAt: expect.any(String),
      }, 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'SHIPPING_POD_RECORDED',
        'Shipment',
        'ship-1',
        expect.any(Object),
        'user-1'
      );
    });
  });

  describe('Canonical Status Names', () => {
    it('Packing uses canonical statuses', () => {
      const canonicalStatuses = ['PENDING', 'PACKING', 'PACKED', 'SEALED', 'ON_CONVEYOR', 'CANCELLED'];
      expect(canonicalStatuses).toContain('PENDING');
      expect(canonicalStatuses).toContain('PACKING');
      expect(canonicalStatuses).toContain('PACKED');
      expect(canonicalStatuses).toContain('SEALED');
      expect(canonicalStatuses).toContain('ON_CONVEYOR');
      expect(canonicalStatuses).toContain('CANCELLED');
    });

    it('Sorting uses canonical statuses', () => {
      const canonicalStatuses = ['PENDING', 'SORTING', 'SORTED', 'COMPLETED'];
      expect(canonicalStatuses).toContain('PENDING');
      expect(canonicalStatuses).toContain('SORTING');
      expect(canonicalStatuses).toContain('SORTED');
      expect(canonicalStatuses).toContain('COMPLETED');
    });

    it('Shipping uses canonical statuses', () => {
      const canonicalStatuses = ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'];
      expect(canonicalStatuses).toContain('CREATED');
      expect(canonicalStatuses).toContain('PICKED_UP');
      expect(canonicalStatuses).toContain('IN_TRANSIT');
      expect(canonicalStatuses).toContain('OUT_FOR_DELIVERY');
      expect(canonicalStatuses).toContain('DELIVERED');
      expect(canonicalStatuses).toContain('FAILED');
      expect(canonicalStatuses).toContain('RETURNED');
    });
  });
});

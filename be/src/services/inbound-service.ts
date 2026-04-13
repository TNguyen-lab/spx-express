import prisma from '../config/db.js';
import { eventEmitter } from '../events/emitter.js';
import { InboundStatus } from '../constants/workflow-status';
import { validateTransition } from './inbound-state-machine';

type Role = 'ADMIN' | 'QUALITY' | 'ACCOUNTING' | 'WAREHOUSE_DIRECTOR' | 'STAFF' | 'DRIVER';

interface CreateInboundInput {
  purchaseOrderId?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string;
  }>;
  userId: string;
}

async function generateInboundNumber(): Promise<string> {
  const count = await prisma.inbound.count();
  const num = (count + 1).toString().padStart(5, '0');
  return `IN${new Date().getFullYear()}${num}`;
}

async function getInboundOrThrow(id: string) {
  const inbound = await prisma.inbound.findUnique({
    where: { id },
    include: { items: true, purchaseOrder: { include: { supplier: true } } },
  });
  if (!inbound) {
    throw new Error('Inbound not found');
  }
  return inbound;
}

export function toWorkflowStatus(dbStatus: string): string {
  const map: Record<string, string> = {
    INBOUND_CREATED: InboundStatus.INBOUND_CREATED,
    ITEMS_RECEIVED: InboundStatus.ITEMS_RECEIVED,
    QUALITY_CHECKING: InboundStatus.QUALITY_CHECKING,
    QC_PASSED: InboundStatus.QC_PASSED,
    QC_FAILED: InboundStatus.QC_FAILED,
    BARCODE_CREATED: InboundStatus.BARCODE_CREATED,
    LOCATION_ASSIGNED: InboundStatus.LOCATION_ASSIGNED,
    STAFF_RECEIVED: InboundStatus.STAFF_RECEIVED,
    NEW_PRODUCT_CREATED: InboundStatus.NEW_PRODUCT_CREATED,
    INVENTORY_UPDATED: InboundStatus.INVENTORY_UPDATED,
    INBOUND_COMPLETED: InboundStatus.INBOUND_COMPLETED,
    INBOUND_CANCELLED: InboundStatus.INBOUND_CANCELLED,
  };
  return map[dbStatus] ?? dbStatus;
}

export const inboundService = {
  async createInbound(input: CreateInboundInput) {
    if (input.purchaseOrderId) {
      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id: input.purchaseOrderId },
      });
      if (!purchaseOrder) {
        throw new Error('Đơn đặt hàng không tồn tại. Purchase order not found.');
      }
      if (purchaseOrder.status !== 'COMPLETED') {
        throw new Error(
          `Chỉ có thể tạo phiếu nhập kho từ đơn đặt hàng đã hoàn tất. Trạng thái hiện tại: ${purchaseOrder.status}. Only purchase orders with COMPLETED status can create inbound receipts.`
        );
      }
    }

    const inboundNumber = await generateInboundNumber();

    const inbound = await prisma.inbound.create({
      data: {
        inboundNumber,
        purchaseOrderId: input.purchaseOrderId,
        staffId: input.userId,
        notes: input.notes,
        status: 'INBOUND_CREATED',
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        },
      },
      include: {
        purchaseOrder: { include: { supplier: true } },
        items: { include: { product: true } },
      },
    });

    await eventEmitter.emit(
      'INBOUND_CREATED',
      'Inbound',
      inbound.id,
      { inboundNumber: inbound.inboundNumber, itemCount: input.items.length },
      input.userId
    );

    return inbound;
  },

  async receiveItems(id: string, role: Role, userId: string) {
    const inbound = await getInboundOrThrow(id);

    validateTransition(
      toWorkflowStatus(inbound.status) as never,
      InboundStatus.ITEMS_RECEIVED as never,
      role
    );

    const updated = await prisma.inbound.update({
      where: { id },
      data: { status: 'ITEMS_RECEIVED', receivedDate: new Date() },
    });

    await eventEmitter.emit(
      'INBOUND_ITEMS_RECEIVED',
      'Inbound',
      inbound.id,
      { inboundNumber: inbound.inboundNumber },
      userId
    );

    return updated;
  },

  async startQualityCheck(id: string, role: Role, userId: string) {
    const inbound = await getInboundOrThrow(id);

    validateTransition(
      toWorkflowStatus(inbound.status) as never,
      InboundStatus.QUALITY_CHECKING as never,
      role
    );

    const updated = await prisma.inbound.update({
      where: { id },
      data: { status: 'QUALITY_CHECKING' },
    });

    await eventEmitter.emit(
      'INBOUND_QUALITY_CHECKING',
      'Inbound',
      inbound.id,
      { inboundNumber: inbound.inboundNumber },
      userId
    );

    return updated;
  },

  async passQC(id: string, role: Role, userId: string) {
    const inbound = await getInboundOrThrow(id);

    validateTransition(
      toWorkflowStatus(inbound.status) as never,
      InboundStatus.QC_PASSED as never,
      role
    );

    const updated = await prisma.inbound.update({
      where: { id },
      data: { status: 'QC_PASSED', qcPassedDate: new Date() },
    });

    await eventEmitter.emit(
      'INBOUND_QC_PASSED',
      'Inbound',
      inbound.id,
      { inboundNumber: inbound.inboundNumber, passed: true },
      userId
    );

    return updated;
  },

  async failQC(id: string, role: Role, userId: string, reason?: string) {
    const inbound = await getInboundOrThrow(id);

    validateTransition(
      toWorkflowStatus(inbound.status) as never,
      InboundStatus.QC_FAILED as never,
      role
    );

    const updated = await prisma.inbound.update({
      where: { id },
      data: { status: 'QC_FAILED', notes: reason || inbound.notes },
    });

    await eventEmitter.emit(
      'INBOUND_QC_FAILED',
      'Inbound',
      inbound.id,
      { inboundNumber: inbound.inboundNumber, reason },
      userId
    );

    return updated;
  },

  async recheckAfterFailure(id: string, role: Role, userId: string) {
    const inbound = await getInboundOrThrow(id);

    validateTransition(
      toWorkflowStatus(inbound.status) as never,
      InboundStatus.QUALITY_CHECKING as never,
      role
    );

    const updated = await prisma.inbound.update({
      where: { id },
      data: { status: 'QUALITY_CHECKING' },
    });

    await eventEmitter.emit(
      'INBOUND_QUALITY_CHECKING',
      'Inbound',
      inbound.id,
      { inboundNumber: inbound.inboundNumber, recheck: true },
      userId
    );

    return updated;
  },

  async createBarcodes(id: string, role: Role, userId: string) {
    const inbound = await getInboundOrThrow(id);

    validateTransition(
      toWorkflowStatus(inbound.status) as never,
      InboundStatus.BARCODE_CREATED as never,
      role
    );

    for (const item of inbound.items) {
      const barcode = `${inbound.inboundNumber}-${item.id.substring(0, 8)}`;
      await prisma.inboundItem.update({
        where: { id: item.id },
        data: { barcode },
      });
    }

    const updated = await prisma.inbound.update({
      where: { id },
      data: { status: 'BARCODE_CREATED' },
    });

    await eventEmitter.emit(
      'INBOUND_BARCODE_CREATED',
      'Inbound',
      inbound.id,
      { inboundNumber: inbound.inboundNumber },
      userId
    );

    return updated;
  },

  async assignLocation(id: string, role: Role, userId: string, itemId: string, locationId: string) {
    const inbound = await getInboundOrThrow(id);

    validateTransition(
      toWorkflowStatus(inbound.status) as never,
      InboundStatus.LOCATION_ASSIGNED as never,
      role
    );

    await prisma.inboundItem.update({
      where: { id: itemId },
      data: { locationId },
    });

    const updated = await prisma.inbound.update({
      where: { id },
      data: { status: 'LOCATION_ASSIGNED' },
    });

    await eventEmitter.emit(
      'INBOUND_LOCATION_ASSIGNED',
      'Inbound',
      inbound.id,
      { inboundNumber: inbound.inboundNumber, locationId },
      userId
    );

    return updated;
  },

  async autoAssignLocations(id: string, role: Role, userId: string) {
    const inbound = await getInboundOrThrow(id);

    validateTransition(
      toWorkflowStatus(inbound.status) as never,
      InboundStatus.LOCATION_ASSIGNED as never,
      role
    );

    // Auto-create demo locations if warehouse is empty
    let locations = await prisma.warehouseLocation.findMany({
      where: { isActive: true },
      orderBy: [{ zone: 'asc' }, { row: 'asc' }, { shelf: 'asc' }],
    });

    if (locations.length === 0) {
      const zones = ['A', 'B', 'C', 'D'];
      for (const zone of zones) {
        for (let row = 1; row <= 5; row++) {
          for (let shelf = 1; shelf <= 4; shelf++) {
            await prisma.warehouseLocation.create({
              data: {
                id: `loc-${zone}-${row}-${shelf}`,
                zone,
                row,
                shelf,
                capacity: 100,
              },
            });
          }
        }
      }
      locations = await prisma.warehouseLocation.findMany({
        where: { isActive: true },
        orderBy: [{ zone: 'asc' }, { row: 'asc' }, { shelf: 'asc' }],
      });
    }

    const itemsWithoutLocation = inbound.items.filter((item) => !item.locationId);

    if (itemsWithoutLocation.length === 0) {
      throw new Error('Tất cả kiện hàng đã được gán vị trí. All items already have locations assigned.');
    }

    const locationUsage = await prisma.inboundItem.groupBy({
      by: ['locationId'],
      where: { locationId: { not: null } },
      _count: { locationId: true },
    });
    const usageMap = new Map<string, number>();
    for (const entry of locationUsage) {
      if (entry.locationId) {
        usageMap.set(entry.locationId, entry._count.locationId);
      }
    }

    const sortedLocations = [...locations].sort((a, b) => {
      const usageA = usageMap.get(a.id) ?? 0;
      const usageB = usageMap.get(b.id) ?? 0;
      return usageA - usageB;
    });

    let locationIndex = 0;
    for (const item of itemsWithoutLocation) {
      const location = sortedLocations[locationIndex % sortedLocations.length];
      await prisma.inboundItem.update({
        where: { id: item.id },
        data: { locationId: location.id },
      });
      locationIndex++;
    }

    const updated = await prisma.inbound.update({
      where: { id },
      data: { status: 'LOCATION_ASSIGNED' },
      include: {
        purchaseOrder: { include: { supplier: true } },
        items: { include: { product: true, location: true } },
      },
    });

    await eventEmitter.emit(
      'INBOUND_LOCATION_ASSIGNED',
      'Inbound',
      inbound.id,
      { inboundNumber: inbound.inboundNumber, autoAssigned: true, itemCount: itemsWithoutLocation.length },
      userId
    );

    return updated;
  },

  async confirmReceipt(id: string, role: Role, userId: string) {
    const inbound = await getInboundOrThrow(id);

    validateTransition(
      toWorkflowStatus(inbound.status) as never,
      InboundStatus.STAFF_RECEIVED as never,
      role
    );

    const updated = await prisma.inbound.update({
      where: { id },
      data: { status: 'STAFF_RECEIVED' },
    });

    await eventEmitter.emit(
      'INBOUND_STAFF_RECEIVED',
      'Inbound',
      inbound.id,
      { inboundNumber: inbound.inboundNumber },
      userId
    );

    return updated;
  },

  async cancelInbound(id: string, role: Role, userId: string, reason?: string) {
    const inbound = await getInboundOrThrow(id);

    validateTransition(
      toWorkflowStatus(inbound.status) as never,
      InboundStatus.INBOUND_CANCELLED as never,
      role
    );

    const updated = await prisma.inbound.update({
      where: { id },
      data: { status: 'INBOUND_CANCELLED', notes: reason || inbound.notes },
    });

    await eventEmitter.emit(
      'INBOUND_CANCELLED',
      'Inbound',
      inbound.id,
      { inboundNumber: inbound.inboundNumber, reason },
      userId
    );

    return updated;
  },

  async completeInbound(id: string, role: Role, userId: string) {
    const inbound = await getInboundOrThrow(id);

    validateTransition(
      toWorkflowStatus(inbound.status) as never,
      InboundStatus.INBOUND_COMPLETED as never,
      role
    );

    const newProductsCreated: string[] = [];

    for (const item of inbound.items) {
      const existingProduct = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!existingProduct) {
        const count = await prisma.product.count();
        const sku = `PROD-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

        await prisma.product.create({
          data: {
            id: item.productId,
            sku,
            name: `New Product ${item.productId.substring(0, 8)}`,
          },
        });

        newProductsCreated.push(item.productId);

        await eventEmitter.emit(
          'INBOUND_NEW_PRODUCT_CREATED',
          'Inbound',
          inbound.id,
          { inboundNumber: inbound.inboundNumber, productId: item.productId, sku },
          userId
        );
      }

      const existingInventory = await prisma.inventory.findUnique({
        where: { productId: item.productId },
      });

      if (existingInventory) {
        await prisma.inventory.update({
          where: { productId: item.productId },
          data: {
            quantity: { increment: item.receivedQty },
            available: { increment: item.receivedQty },
          },
        });
      } else {
        await prisma.inventory.create({
          data: {
            productId: item.productId,
            quantity: item.receivedQty,
            available: item.receivedQty,
          },
        });
      }

      await eventEmitter.emit(
        'INBOUND_INVENTORY_UPDATED',
        'Inbound',
        inbound.id,
        { inboundNumber: inbound.inboundNumber, productId: item.productId, quantity: item.receivedQty },
        userId
      );
    }

    const updated = await prisma.inbound.update({
      where: { id },
      data: { status: 'INBOUND_COMPLETED', completedDate: new Date() },
    });

    await eventEmitter.emit(
      'INBOUND_COMPLETED',
      'Inbound',
      inbound.id,
      { inboundNumber: inbound.inboundNumber, itemsUpdated: inbound.items.length, newProductsCreated: newProductsCreated.length },
      userId
    );

    return updated;
  },
};
import prisma from '../config/db.js';
import { eventEmitter } from '../events/emitter.js';
import { PurchaseOrderStatus } from '../constants/workflow-status';
import { validateTransition } from './purchase-order-state-machine';

type Role = 'ADMIN' | 'QUALITY' | 'ACCOUNTING' | 'WAREHOUSE_DIRECTOR' | 'STAFF' | 'DRIVER';

interface CreatePurchaseOrderInput {
  supplierId: string;
  expectedDate?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  userId: string;
}

async function generateOrderNumber(): Promise<string> {
  const count = await prisma.purchaseOrder.count();
  const num = (count + 1).toString().padStart(5, '0');
  return `PO${new Date().getFullYear()}${num}`;
}

function toWorkflowStatus(dbStatus: string): string {
  const map: Record<string, string> = {
    DRAFT: PurchaseOrderStatus.PURCHASE_PLAN_CREATED,
    PENDING_ACCOUNTING: PurchaseOrderStatus.PLAN_CONFIRMED_BY_ACCOUNTING,
    PENDING_APPROVAL: PurchaseOrderStatus.PLAN_SENT_TO_DIRECTOR,
    APPROVED: PurchaseOrderStatus.PLAN_APPROVED,
    SENT_TO_SUPPLIER: PurchaseOrderStatus.ORDER_SENT_TO_SUPPLIER,
    SUPPLIER_CONFIRMED: PurchaseOrderStatus.SUPPLIER_CONFIRMED,
    SUPPLIER_REJECTED: PurchaseOrderStatus.SUPPLIER_REJECTED,
    CANCELLED: PurchaseOrderStatus.ORDER_CANCELLED,
    COMPLETED: PurchaseOrderStatus.ORDER_COMPLETED,
  };
  return map[dbStatus] ?? dbStatus;
}

async function getOrderOrThrow(id: string) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true },
  });
  if (!order) {
    throw new Error('Order not found');
  }
  return order;
}

export const purchaseOrderService = {
  async createPurchaseOrder(input: CreatePurchaseOrderInput) {
    const orderNumber = await generateOrderNumber();
    const itemsData = input.items.map((item) => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    }));

    const totalAmount = itemsData.reduce((sum, item) => sum + item.totalPrice, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: input.supplierId,
        expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
        notes: input.notes,
        createdById: input.userId,
        status: 'DRAFT',
        items: {
          create: itemsData,
        },
      },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });

    await eventEmitter.emit(
      'ORDER_PURCHASE_PLAN_CREATED',
      'PurchaseOrder',
      order.id,
      {
        orderNumber: order.orderNumber,
        supplier: order.supplier.name,
        totalAmount,
      },
      input.userId
    );

    return order;
  },

  async sendToAccounting(id: string, role: Role, userId: string) {
    const order = await getOrderOrThrow(id);

    validateTransition(
      toWorkflowStatus(order.status) as never,
      PurchaseOrderStatus.PLAN_CONFIRMED_BY_ACCOUNTING as never,
      role
    );

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'PENDING_ACCOUNTING' },
    });

    await eventEmitter.emit(
      'ORDER_PLAN_SENT_TO_ACCOUNTING',
      'PurchaseOrder',
      order.id,
      { orderNumber: order.orderNumber },
      userId
    );

    return updated;
  },

  async confirmAccounting(id: string, role: Role, userId: string, notes?: string) {
    const order = await getOrderOrThrow(id);

    validateTransition(
      toWorkflowStatus(order.status) as never,
      PurchaseOrderStatus.PLAN_SENT_TO_DIRECTOR as never,
      role
    );

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });

    await prisma.purchaseOrderApproval.create({
      data: {
        purchaseOrderId: order.id,
        approverId: userId,
        role: 'ACCOUNTING',
        status: 'APPROVED',
        notes,
        approvedAt: new Date(),
      },
    });

    await eventEmitter.emit(
      'ORDER_PLAN_CONFIRMED_BY_ACCOUNTING',
      'PurchaseOrder',
      order.id,
      { orderNumber: order.orderNumber },
      userId
    );

    return updated;
  },

  async sendToDirector(id: string, role: Role, userId: string) {
    const order = await getOrderOrThrow(id);

    validateTransition(
      toWorkflowStatus(order.status) as never,
      PurchaseOrderStatus.PLAN_SENT_TO_DIRECTOR as never,
      role
    );

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });

    await eventEmitter.emit(
      'ORDER_PLAN_SENT_TO_DIRECTOR',
      'PurchaseOrder',
      order.id,
      { orderNumber: order.orderNumber },
      userId
    );

    return updated;
  },

  async approve(id: string, role: Role, userId: string, notes?: string) {
    const order = await getOrderOrThrow(id);

    validateTransition(
      toWorkflowStatus(order.status) as never,
      PurchaseOrderStatus.PLAN_APPROVED as never,
      role
    );

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    await prisma.purchaseOrderApproval.create({
      data: {
        purchaseOrderId: order.id,
        approverId: userId,
        role: 'WAREHOUSE_DIRECTOR',
        status: 'APPROVED',
        notes,
        approvedAt: new Date(),
      },
    });

    await eventEmitter.emit(
      'ORDER_PLAN_APPROVED',
      'PurchaseOrder',
      order.id,
      { orderNumber: order.orderNumber },
      userId
    );

    return updated;
  },

  async reject(id: string, role: Role, userId: string, notes?: string) {
    const order = await getOrderOrThrow(id);

    validateTransition(
      toWorkflowStatus(order.status) as never,
      PurchaseOrderStatus.ORDER_CANCELLED as never,
      role
    );

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED', notes: notes || order.notes },
    });

    await prisma.purchaseOrderApproval.create({
      data: {
        purchaseOrderId: order.id,
        approverId: userId,
        role: 'WAREHOUSE_DIRECTOR',
        status: 'REJECTED',
        notes,
        approvedAt: new Date(),
      },
    });

    await eventEmitter.emit(
      'ORDER_PLAN_REJECTED',
      'PurchaseOrder',
      order.id,
      { orderNumber: order.orderNumber, reason: notes },
      userId
    );

    return updated;
  },

  async sendToSupplier(id: string, role: Role, userId: string) {
    const order = await getOrderOrThrow(id);

    validateTransition(
      toWorkflowStatus(order.status) as never,
      PurchaseOrderStatus.ORDER_SENT_TO_SUPPLIER as never,
      role
    );

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT_TO_SUPPLIER' },
    });

    await eventEmitter.emit(
      'ORDER_SENT_TO_SUPPLIER',
      'PurchaseOrder',
      order.id,
      {
        orderNumber: order.orderNumber,
        supplier: order.supplier?.name,
      },
      userId
    );

    return updated;
  },

  async supplierResponse(id: string, role: Role, userId: string, confirmed: boolean) {
    const order = await getOrderOrThrow(id);

    if (confirmed) {
      validateTransition(toWorkflowStatus(order.status) as never, PurchaseOrderStatus.SUPPLIER_CONFIRMED as never, role);

      await eventEmitter.emit(
        'SUPPLIER_CONFIRMED',
        'PurchaseOrder',
        order.id,
        { orderNumber: order.orderNumber, confirmed: true },
        userId
      );

      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });

      await eventEmitter.emit(
        'ORDER_COMPLETED',
        'PurchaseOrder',
        order.id,
        { orderNumber: order.orderNumber },
        userId
      );

      return updated;
    }

    validateTransition(toWorkflowStatus(order.status) as never, PurchaseOrderStatus.SUPPLIER_REJECTED as never, role);

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SUPPLIER_REJECTED' },
    });

    await eventEmitter.emit(
      'SUPPLIER_REJECTED',
      'PurchaseOrder',
      order.id,
      { orderNumber: order.orderNumber, confirmed: false },
      userId
    );

    return updated;
  },

  async complete(id: string, role: Role, userId: string) {
    const order = await getOrderOrThrow(id);

    validateTransition(
      toWorkflowStatus(order.status) as never,
      PurchaseOrderStatus.ORDER_COMPLETED as never,
      role
    );

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    await eventEmitter.emit(
      'ORDER_COMPLETED',
      'PurchaseOrder',
      order.id,
      { orderNumber: order.orderNumber },
      userId
    );

    return updated;
  },

  async cancel(id: string, role: Role, userId: string) {
    const order = await getOrderOrThrow(id);

    if (order.status === 'SUPPLIER_REJECTED') {
      if (!['ACCOUNTING', 'ADMIN'].includes(role)) {
        throw new Error('Insufficient permissions');
      }
    } else {
      validateTransition(
        toWorkflowStatus(order.status) as never,
        PurchaseOrderStatus.ORDER_CANCELLED as never,
        role
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await eventEmitter.emit(
      'ORDER_CANCELLED',
      'PurchaseOrder',
      order.id,
      { orderNumber: order.orderNumber },
      userId
    );

    return updated;
  },
};

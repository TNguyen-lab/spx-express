import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrderStatus } from '../../constants/canonical-status';

const { mockPrisma, mockPublishEvent, mockPublishEventWithTx, mockStateMachine } = vi.hoisted(() => ({
  mockPrisma: {
    purchaseOrder: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    purchaseOrderApproval: {
      create: vi.fn(),
    },
    inbound: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
  mockPublishEvent: vi.fn().mockResolvedValue(undefined),
  mockPublishEventWithTx: vi.fn().mockResolvedValue(undefined),
  mockStateMachine: {
    validateTransition: vi.fn(),
  },
}));

vi.mock('../../config/db.js', () => ({
  default: mockPrisma,
}));

vi.mock('../../shared/events/application-event-publisher.js', () => ({
  publishEvent: mockPublishEvent,
  publishEventWithTx: mockPublishEventWithTx,
}));

vi.mock('../../modules/purchase-order/domain/aggregates/purchase-order-policy.js', () => mockStateMachine);

vi.mock('../../modules/shared/transactions.js', () => ({
  withTransaction: async (operation: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      purchaseOrder: mockPrisma.purchaseOrder,
      purchaseOrderApproval: mockPrisma.purchaseOrderApproval,
      inbound: mockPrisma.inbound,
    };

    return operation(tx);
  },
}));

import { createPurchaseOrder } from '../../modules/purchase-order/application/commands/create-purchase-order';
import { confirmAccounting } from '../../modules/purchase-order/application/commands/confirm-accounting';
import { approvePurchaseOrder } from '../../modules/purchase-order/application/commands/approve-purchase-order';
import { supplierResponse } from '../../modules/purchase-order/application/commands/supplier-response';
import { cancelPurchaseOrder } from '../../modules/purchase-order/application/commands/cancel-purchase-order';

describe('purchase-order-module commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a purchase order in DRAFT and emits the purchase plan event', async () => {
    mockPrisma.purchaseOrder.count.mockResolvedValue(0);
    mockPrisma.purchaseOrder.create.mockResolvedValue({
      id: 'po-1',
      orderNumber: 'PO202600001',
      status: 'DRAFT',
      supplier: { name: 'ACME' },
      items: [],
    });

    const result = await createPurchaseOrder({
      supplierId: 's1',
      items: [{ productId: 'p1', quantity: 2, unitPrice: 10 }],
      userId: 'u1',
    });

    expect(result.status).toBe('DRAFT');
    expect(mockPublishEvent).toHaveBeenCalledWith(
      'ORDER_PURCHASE_PLAN_CREATED',
      'PurchaseOrder',
      'po-1',
      expect.objectContaining({ orderNumber: 'PO202600001' }),
      'u1'
    );
  });

  it('moves a plan from accounting confirmation to pending approval', async () => {
    mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
      id: 'po-1',
      orderNumber: 'PO202600001',
      status: 'PENDING_ACCOUNTING',
      supplier: { name: 'ACME' },
      items: [],
      approvals: [],
      inbound: null,
    });
    mockPrisma.purchaseOrder.update.mockResolvedValue({ id: 'po-1', status: 'PENDING_APPROVAL' });

    const updated = await confirmAccounting('po-1', 'ACCOUNTING', 'u2', 'ok');

    expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
      PurchaseOrderStatus.PENDING_ACCOUNTING,
      PurchaseOrderStatus.PENDING_APPROVAL,
      'ACCOUNTING'
    );
    expect(mockPrisma.purchaseOrderApproval.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          purchaseOrderId: 'po-1',
          role: 'ACCOUNTING',
          status: 'APPROVED',
        }),
      })
    );
    expect(updated.status).toBe('PENDING_APPROVAL');
  });

  it('lets director approve after accounting confirmation', async () => {
    mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
      id: 'po-1',
      orderNumber: 'PO202600001',
      status: 'PENDING_APPROVAL',
      supplier: { name: 'ACME' },
      items: [],
      approvals: [],
      inbound: null,
    });
    mockPrisma.purchaseOrder.update.mockResolvedValue({ id: 'po-1', status: 'APPROVED' });

    const updated = await approvePurchaseOrder('po-1', 'WAREHOUSE_DIRECTOR', 'u3', 'approved');

    expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
      PurchaseOrderStatus.PENDING_APPROVAL,
      PurchaseOrderStatus.APPROVED,
      'WAREHOUSE_DIRECTOR'
    );
    expect(mockPrisma.purchaseOrderApproval.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'WAREHOUSE_DIRECTOR',
          status: 'APPROVED',
        }),
      })
    );
    expect(updated.status).toBe('APPROVED');
  });

  it('creates inbound handoff when supplier confirms', async () => {
    mockPrisma.purchaseOrder.findUnique
      .mockResolvedValueOnce({
        id: 'po-1',
        orderNumber: 'PO202600001',
        status: 'SENT_TO_SUPPLIER',
        supplier: { name: 'ACME' },
        items: [{ productId: 'p1', quantity: 2 }],
        approvals: [],
        inbound: null,
      })
      .mockResolvedValueOnce({
        id: 'po-1',
        orderNumber: 'PO202600001',
        status: 'SUPPLIER_CONFIRMED',
        supplier: { name: 'ACME' },
        items: [{ productId: 'p1', quantity: 2 }],
        approvals: [],
        inbound: null,
      });
    mockPrisma.purchaseOrder.update.mockResolvedValue({ id: 'po-1', status: 'SUPPLIER_CONFIRMED' });
    mockPrisma.inbound.count.mockResolvedValue(0);
    mockPrisma.inbound.create.mockResolvedValue({
      id: 'in-1',
      inboundNumber: 'IN202600001',
      status: 'INBOUND_CREATED',
    });

    const updated = await supplierResponse('po-1', 'ADMIN', 'u1', true);

    expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
      PurchaseOrderStatus.SENT_TO_SUPPLIER,
      PurchaseOrderStatus.SUPPLIER_CONFIRMED,
      'ADMIN'
    );
    expect(mockPrisma.inbound.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          purchaseOrderId: 'po-1',
          status: 'INBOUND_CREATED',
        }),
      })
    );
    expect(updated.status).toBe('SUPPLIER_CONFIRMED');
  });

  it('records supplier rejection and allows accounting cancellation', async () => {
    mockPrisma.purchaseOrder.findUnique
      .mockResolvedValueOnce({
      id: 'po-1',
      orderNumber: 'PO202600001',
      status: 'SENT_TO_SUPPLIER',
      supplier: { name: 'ACME' },
      items: [],
      approvals: [],
      inbound: null,
      })
      .mockResolvedValueOnce({
        id: 'po-1',
        orderNumber: 'PO202600001',
        status: 'SUPPLIER_REJECTED',
        supplier: { name: 'ACME' },
        items: [],
        approvals: [],
        inbound: null,
      });
    mockPrisma.purchaseOrder.update
      .mockResolvedValueOnce({ id: 'po-1', status: 'SUPPLIER_REJECTED' })
      .mockResolvedValueOnce({ id: 'po-1', status: 'CANCELLED' });

    await supplierResponse('po-1', 'ADMIN', 'u1', false);
    const cancelled = await cancelPurchaseOrder('po-1', 'ACCOUNTING', 'u2');

    expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
      PurchaseOrderStatus.SENT_TO_SUPPLIER,
      PurchaseOrderStatus.SUPPLIER_REJECTED,
      'ADMIN'
    );
    expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
      PurchaseOrderStatus.SUPPLIER_REJECTED,
      PurchaseOrderStatus.CANCELLED,
      'ACCOUNTING'
    );
    expect(cancelled.status).toBe('CANCELLED');
  });
});

import type { Prisma } from '@prisma/client';
import prisma from '../../../../../config/db.js';
import {
  recordTransferDispatch,
  recordTransferReceipt,
  recordTransferDiscrepancy,
} from '../movements/index.js';

type TransferTx = Prisma.TransactionClient & {
  transfer: Prisma.TransferDelegate<any>;
  transferItem: Prisma.TransferItemDelegate<any>;
  transferReconciliation: Prisma.TransferReconciliationDelegate<any>;
};

export type TransferStatus = 'PENDING' | 'APPROVED' | 'DISPATCHED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED' | 'EXCEPTION';

export interface CreateTransferInput {
  items: Array<{ productId: string; quantity: number }>;
  fromLocationId: string;
  toLocationId: string;
  notes?: string;
  requestedById: string;
}

export interface ApproveTransferInput {
  transferId: string;
  approvedById: string;
  notes?: string;
}

export interface DispatchTransferInput {
  transferId: string;
  items: Array<{ productId: string; quantity: number }>;
  staffId: string;
}

export interface ReceiveTransferInput {
  transferId: string;
  items: Array<{ productId: string; receivedQuantity: number }>;
  notes?: string;
  staffId: string;
}

export interface HandleDiscrepancyInput {
  transferId: string;
  items: Array<{
    productId: string;
    expectedQuantity: number;
    actualQuantity: number;
  }>;
  notes?: string;
  staffId: string;
}

export interface CancelTransferInput {
  transferId: string;
  reason?: string;
  staffId: string;
}

function generateTransferNumber(): string {
  return `TRF${new Date().getFullYear()}${Date.now().toString().slice(-8)}`;
}

export function validateTransferTransition(currentStatus: string, targetStatus: string): boolean {
  const transitions: Record<string, string[]> = {
    PENDING: ['APPROVED', 'CANCELLED'],
    APPROVED: ['DISPATCHED', 'CANCELLED'],
    DISPATCHED: ['IN_TRANSIT', 'EXCEPTION'],
    IN_TRANSIT: ['RECEIVED', 'EXCEPTION'],
    RECEIVED: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
    EXCEPTION: ['RECEIVED', 'CANCELLED'],
  };

  return transitions[currentStatus]?.includes(targetStatus) ?? false;
}

export async function createTransferRequest(
  tx: TransferTx,
  input: CreateTransferInput
) {
  const transferNumber = generateTransferNumber();

  const transfer = await tx.transfer.create({
    data: {
      transferNumber,
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      status: 'PENDING',
      requestedById: input.requestedById,
      notes: input.notes,
      items: {
        create: input.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          receivedQty: 0,
        })),
      },
    },
    include: {
      items: { include: { product: true } },
      fromLocation: true,
      toLocation: true,
      requestedBy: { select: { id: true, name: true } },
    },
  });

  return transfer;
}

export async function approveTransfer(
  tx: TransferTx,
  input: ApproveTransferInput
) {
  const transfer = await tx.transfer.findUnique({
    where: { id: input.transferId },
  });

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  if (transfer.status !== 'PENDING') {
    throw new Error('Transfer not in PENDING status');
  }

  const updated = await tx.transfer.update({
    where: { id: input.transferId },
    data: {
      status: 'APPROVED',
      approvedById: input.approvedById,
      notes: input.notes ? `${transfer.notes || ''}\nApproved: ${input.notes}`.trim() : transfer.notes,
    },
    include: {
      items: { include: { product: true } },
      fromLocation: true,
      toLocation: true,
      requestedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  return updated;
}

export async function dispatchTransfer(
  tx: TransferTx,
  input: DispatchTransferInput
) {
  const transfer = await tx.transfer.findUnique({
    where: { id: input.transferId },
    include: { items: true },
  });

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  if (transfer.status !== 'APPROVED') {
    throw new Error('Transfer not in APPROVED status');
  }

  for (const item of input.items) {
    await recordTransferDispatch(tx, {
      transferId: transfer.id,
      productId: item.productId,
      quantity: item.quantity,
      fromLocationId: transfer.fromLocationId,
      toLocationId: transfer.toLocationId,
      createdById: input.staffId,
      notes: `Transfer dispatch ${transfer.transferNumber}`,
    });
  }

  const updated = await tx.transfer.update({
    where: { id: input.transferId },
    data: {
      status: 'DISPATCHED',
      dispatchedAt: new Date(),
    },
    include: {
      items: { include: { product: true } },
      fromLocation: true,
      toLocation: true,
    },
  });

  return updated;
}

export async function receiveTransfer(
  tx: TransferTx,
  input: ReceiveTransferInput
) {
  const transfer = await tx.transfer.findUnique({
    where: { id: input.transferId },
    include: { items: true },
  });

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  if (transfer.status !== 'DISPATCHED' && transfer.status !== 'IN_TRANSIT') {
    throw new Error('Transfer not in DISPATCHED or IN_TRANSIT status');
  }

  for (const item of input.items) {
    const dispatchItem = transfer.items.find(ti => ti.productId === item.productId);
    if (!dispatchItem) {
      throw new Error(`Product ${item.productId} not in transfer`);
    }

    await recordTransferReceipt(tx, {
      transferId: transfer.id,
      productId: item.productId,
      quantity: item.receivedQuantity,
      fromLocationId: transfer.fromLocationId,
      toLocationId: transfer.toLocationId,
      createdById: input.staffId,
      notes: input.notes || `Transfer received ${transfer.transferNumber}`,
    });

    await tx.transferItem.update({
      where: { id: dispatchItem.id },
      data: { receivedQty: item.receivedQuantity },
    });
  }

  const updated = await tx.transfer.update({
    where: { id: input.transferId },
    data: {
      status: 'RECEIVED',
      receivedAt: new Date(),
    },
    include: {
      items: { include: { product: true } },
      fromLocation: true,
      toLocation: true,
    },
  });

  return updated;
}

export async function handleTransferDiscrepancy(
  tx: TransferTx,
  input: HandleDiscrepancyInput
) {
  const transfer = await tx.transfer.findUnique({
    where: { id: input.transferId },
    include: { items: true },
  });

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  if (!['DISPATCHED', 'IN_TRANSIT'].includes(transfer.status)) {
    throw new Error('Transfer not in valid status for discrepancy');
  }

  const hasDiscrepancy = input.items.some(
    item => item.expectedQuantity !== item.actualQuantity
  );

  for (const item of input.items) {
    const dispatchItem = transfer.items.find(ti => ti.productId === item.productId);
    if (!dispatchItem) {
      throw new Error(`Product ${item.productId} not in transfer`);
    }

    await recordTransferDiscrepancy(tx, {
      transferId: transfer.id,
      productId: item.productId,
      expectedQuantity: item.expectedQuantity,
      actualQuantity: item.actualQuantity,
      fromLocationId: transfer.fromLocationId,
      toLocationId: transfer.toLocationId,
      createdById: input.staffId,
      notes: input.notes || `Transfer discrepancy ${transfer.transferNumber}`,
    });

    if (item.actualQuantity !== item.expectedQuantity) {
      await tx.transferReconciliation.create({
        data: {
          transferId: transfer.id,
          productId: item.productId,
          expectedQty: item.expectedQuantity,
          actualQty: item.actualQuantity,
          discrepancyQty: item.actualQuantity - item.expectedQuantity,
          notes: input.notes,
        },
      });

      await tx.transferItem.update({
        where: { id: dispatchItem.id },
        data: {
          receivedQty: item.actualQuantity,
          discrepancyNote: `Discrepancy: expected ${item.expectedQuantity}, got ${item.actualQuantity}`,
          resolved: false,
        },
      });
    }
  }

  const updatedStatus = hasDiscrepancy ? 'EXCEPTION' : transfer.status;
  const updated = await tx.transfer.update({
    where: { id: input.transferId },
    data: {
      status: updatedStatus,
    },
    include: {
      items: { include: { product: true } },
      reconciliations: true,
      fromLocation: true,
      toLocation: true,
    },
  });

  return updated;
}

export async function cancelTransfer(
  tx: TransferTx,
  input: CancelTransferInput
) {
  const transfer = await tx.transfer.findUnique({
    where: { id: input.transferId },
    include: { items: true },
  });

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  if (['RECEIVED', 'COMPLETED'].includes(transfer.status)) {
    throw new Error('Cannot cancel transfer that has been received or completed');
  }

  if (transfer.status === 'DISPATCHED' || transfer.status === 'IN_TRANSIT' || transfer.status === 'EXCEPTION') {
    for (const item of transfer.items) {
      const pendingQty = item.quantity - (item.receivedQty || 0);
      if (pendingQty > 0) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            quantity: { increment: pendingQty },
            available: { increment: pendingQty },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            movementType: 'TRANSFER_IN',
            quantity: pendingQty,
            referenceType: 'TransferCancellation',
            referenceId: transfer.id,
            fromLocationId: transfer.toLocationId,
            toLocationId: transfer.fromLocationId,
            notes: `Transfer cancelled - returned ${pendingQty} units to source`,
            createdById: input.staffId,
          },
        });
      }
    }
  }

  const updated = await tx.transfer.update({
    where: { id: input.transferId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledById: input.staffId,
      notes: input.reason
        ? `${transfer.notes || ''}\nCancelled: ${input.reason}`.trim()
        : transfer.notes,
    },
  });

  return updated;
}

export async function resolveReconciliation(
  tx: TransferTx,
  input: {
    reconciliationId: string;
    resolution: 'RESOLVED_SOURCE' | 'RESOLVED_DESTINATION' | 'WRITTEN_OFF';
    notes?: string;
    staffId: string;
  }
) {
  const reconciliation = await tx.transferReconciliation.findUnique({
    where: { id: input.reconciliationId },
  });

  if (!reconciliation) {
    throw new Error('Reconciliation not found');
  }

  const updated = await tx.transferReconciliation.update({
    where: { id: input.reconciliationId },
    data: {
      resolvedById: input.staffId,
      resolvedAt: new Date(),
      resolution: input.resolution,
      notes: input.notes,
    },
  });

  const allResolved = await tx.transferReconciliation.findMany({
    where: {
      transferId: reconciliation.transferId,
    },
  });

  const allResolvedCount = allResolved.filter(r => r.resolvedAt !== null).length;
  if (allResolvedCount === allResolved.length) {
    await tx.transfer.update({
      where: { id: reconciliation.transferId },
      data: { status: 'RECEIVED' },
    });
  }

  return updated;
}

export async function getTransferWithContext(
  transferId: string
) {
  return prisma.transfer.findUnique({
    where: { id: transferId },
    include: {
      items: { include: { product: true } },
      reconciliations: { include: { product: true } },
      fromLocation: true,
      toLocation: true,
      requestedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });
}

export async function listTransfers(
  filters: {
    status?: string;
    fromLocationId?: string;
    toLocationId?: string;
    page?: number;
    limit?: number;
  }
) {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.fromLocationId) where.fromLocationId = filters.fromLocationId;
  if (filters.toLocationId) where.toLocationId = filters.toLocationId;

  const page = filters.page || 1;
  const limit = filters.limit || 20;

  const [transfers, total] = await Promise.all([
    prisma.transfer.findMany({
      where,
      include: {
        items: { include: { product: true } },
        fromLocation: true,
        toLocation: true,
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transfer.count({ where }),
  ]);

  return { transfers, total, page, limit };
}

// Keep old signature for backward compatibility during transition
export async function listTransfersWithTx(
  tx: TransferTx,
  filters: {
    status?: string;
    fromLocationId?: string;
    toLocationId?: string;
    page?: number;
    limit?: number;
  }
) {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.fromLocationId) where.fromLocationId = filters.fromLocationId;
  if (filters.toLocationId) where.toLocationId = filters.toLocationId;

  const page = filters.page || 1;
  const limit = filters.limit || 20;

  const [transfers, total] = await Promise.all([
    tx.transfer.findMany({
      where,
      include: {
        items: { include: { product: true } },
        fromLocation: true,
        toLocation: true,
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    tx.transfer.count({ where }),
  ]);

  return { transfers, total, page, limit };
}

import type { Prisma } from '@prisma/client';

export type Tx = Prisma.TransactionClient;

export type PhieuTx = Prisma.TransactionClient & {
  phieuXuatKho: {
    count: () => Promise<number>;
    create: (args: unknown) => Promise<unknown>;
  };
  phieuNhapKho: {
    count: () => Promise<number>;
    create: (args: unknown) => Promise<unknown>;
  };
};

export type MovementType =
  | 'INBOUND'
  | 'OUTBOUND'
  | 'RESERVATION'
  | 'RELEASE'
  | 'ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'DAMAGED'
  | 'RETURNED';

export interface InventoryMovementInput {
  productId: string;
  quantity: number;
  movementType: MovementType;
  referenceType: string;
  referenceId: string;
  createdById?: string;
  notes?: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
}

function assertPositiveQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Inventory movement quantity must be a positive integer');
  }
}

async function findInventoryOrThrow(tx: Tx, productId: string) {
  const inventory = await tx.inventory.findUnique({ where: { productId } });
  if (!inventory) {
    throw new Error(`Inventory not found for product ${productId}`);
  }
  return inventory;
}

async function createMovement(tx: Tx, input: InventoryMovementInput) {
  return tx.inventoryMovement.create({
    data: {
      productId: input.productId,
      movementType: input.movementType,
      quantity: input.quantity,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      fromLocationId: input.fromLocationId ?? null,
      toLocationId: input.toLocationId ?? null,
      notes: input.notes,
      createdById: input.createdById,
    },
  });
}

export async function recordInboundMovement(tx: Tx, input: Omit<InventoryMovementInput, 'movementType'>) {
  assertPositiveQuantity(input.quantity);
  const inventory = await tx.inventory.findUnique({ where: { productId: input.productId } });

  if (inventory) {
    await tx.inventory.update({
      where: { productId: input.productId },
      data: {
        quantity: { increment: input.quantity },
        available: { increment: input.quantity },
      },
    });
  } else {
    await tx.inventory.create({
      data: {
        productId: input.productId,
        quantity: input.quantity,
        available: input.quantity,
        reserved: 0,
        costPrice: 0,
      },
    });
  }

  await createMovement(tx, { ...input, movementType: 'INBOUND' });
}

export async function recordReservationMovement(tx: Tx, input: Omit<InventoryMovementInput, 'movementType'>) {
  assertPositiveQuantity(input.quantity);
  const inventory = await findInventoryOrThrow(tx, input.productId);

  if (inventory.available < input.quantity) {
    throw new Error(`Insufficient available inventory for product ${input.productId}`);
  }

  await tx.inventory.update({
    where: { productId: input.productId },
    data: {
      available: { decrement: input.quantity },
      reserved: { increment: input.quantity },
    },
  });

  await createMovement(tx, { ...input, movementType: 'RESERVATION' });
}

export async function recordReleaseMovement(tx: Tx, input: Omit<InventoryMovementInput, 'movementType'>) {
  assertPositiveQuantity(input.quantity);
  const inventory = await findInventoryOrThrow(tx, input.productId);

  if (inventory.reserved < input.quantity) {
    throw new Error(`Insufficient reserved inventory for product ${input.productId}`);
  }

  await tx.inventory.update({
    where: { productId: input.productId },
    data: {
      reserved: { decrement: input.quantity },
      available: { increment: input.quantity },
    },
  });

  await createMovement(tx, { ...input, movementType: 'RELEASE' });
}

export interface PhieuXuatKhoInput {
  outboundId: string;
  outboundNumber: string;
  createdById?: string;
  notes?: string;
}

export interface PhieuNhapKhoInput {
  inboundId: string;
  inboundNumber: string;
  createdById?: string;
  notes?: string;
}

export async function recordDispatchMovement(tx: Tx, input: Omit<InventoryMovementInput, 'movementType'>) {
  assertPositiveQuantity(input.quantity);
  const inventory = await findInventoryOrThrow(tx, input.productId);

  if (inventory.reserved < input.quantity || inventory.quantity < input.quantity) {
    throw new Error(`Insufficient reserved inventory to dispatch product ${input.productId}`);
  }

  await tx.inventory.update({
    where: { productId: input.productId },
    data: {
      quantity: { decrement: input.quantity },
      reserved: { decrement: input.quantity },
    },
  });

  await createMovement(tx, { ...input, movementType: 'OUTBOUND' });
}

export async function generatePhieuXuatKho(tx: Tx, input: PhieuXuatKhoInput): Promise<any> {
  const phieuTx = tx as PhieuTx;
  const count = await phieuTx.phieuXuatKho.count();
  const num = (count + 1).toString().padStart(5, '0');
  const phieuNumber = `PXK${new Date().getFullYear()}${num}`;

  return phieuTx.phieuXuatKho.create({
    data: {
      phieuNumber,
      outboundId: input.outboundId,
      createdById: input.createdById,
      notes: input.notes,
    },
    include: {
      outbound: {
        include: {
          items: { include: { product: true } },
          picker: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function generatePhieuNhapKho(tx: Tx, input: PhieuNhapKhoInput): Promise<any> {
  const phieuTx = tx as PhieuTx;
  const count = await phieuTx.phieuNhapKho.count();
  const num = (count + 1).toString().padStart(5, '0');
  const phieuNumber = `PNK${new Date().getFullYear()}${num}`;

  return phieuTx.phieuNhapKho.create({
    data: {
      phieuNumber,
      inboundId: input.inboundId,
      createdById: input.createdById,
      notes: input.notes,
    },
    include: {
      inbound: {
        include: {
          items: { include: { product: true } },
          staff: { select: { id: true, name: true } },
          purchaseOrder: { include: { supplier: true } },
        },
      },
    },
  });
}

export async function recordTransferOutMovement(tx: Tx, input: Omit<InventoryMovementInput, 'movementType'>) {
  assertPositiveQuantity(input.quantity);
  const inventory = await findInventoryOrThrow(tx, input.productId);

  if (inventory.quantity < input.quantity || inventory.available < input.quantity) {
    throw new Error(`Insufficient inventory to transfer out product ${input.productId}`);
  }

  await tx.inventory.update({
    where: { productId: input.productId },
    data: {
      quantity: { decrement: input.quantity },
      available: { decrement: input.quantity },
    },
  });

  await createMovement(tx, { ...input, movementType: 'TRANSFER_OUT' });
}

export async function recordTransferInMovement(tx: Tx, input: Omit<InventoryMovementInput, 'movementType'>) {
  assertPositiveQuantity(input.quantity);
  const inventory = await tx.inventory.findUnique({ where: { productId: input.productId } });

  if (inventory) {
    await tx.inventory.update({
      where: { productId: input.productId },
      data: {
        quantity: { increment: input.quantity },
        available: { increment: input.quantity },
      },
    });
  } else {
    await tx.inventory.create({
      data: {
        productId: input.productId,
        quantity: input.quantity,
        available: input.quantity,
        reserved: 0,
        costPrice: 0,
      },
    });
  }

  await createMovement(tx, { ...input, movementType: 'TRANSFER_IN' });
}

export type AdjustmentReasonCode =
  | 'DAMAGED'
  | 'EXPIRED'
  | 'MISCOUNT'
  | 'THEFT'
  | 'OTHER';

export async function recordAdjustmentMovement(
  tx: Tx,
  input: {
    productId: string;
    systemQuantity: number;
    actualQuantity: number;
    referenceType: string;
    referenceId: string;
    createdById?: string;
    notes?: string;
    reasonCode?: AdjustmentReasonCode;
    fromLocationId?: string | null;
    toLocationId?: string | null;
  }
) {
  const delta = input.actualQuantity - input.systemQuantity;

  if (delta === 0) {
    return { movement: null, delta: 0 };
  }

  await findInventoryOrThrow(tx, input.productId);

  await tx.inventory.update({
    where: { productId: input.productId },
    data: {
      quantity: { increment: delta },
      available: { increment: delta },
    },
  });

  const notesWithReason = input.reasonCode
    ? `[${input.reasonCode}] ${input.notes || ''}`.trim()
    : input.notes;

  const movement = await createMovement(tx, {
    productId: input.productId,
    quantity: delta,
    movementType: 'ADJUSTMENT',
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    createdById: input.createdById,
    notes: notesWithReason,
    fromLocationId: input.fromLocationId ?? null,
    toLocationId: input.toLocationId ?? null,
  });

  return { movement, delta };
}

export interface TransferDispatchInput {
  transferId: string;
  productId: string;
  quantity: number;
  fromLocationId: string;
  toLocationId: string;
  createdById?: string;
  notes?: string;
}

export interface TransferReceiptInput {
  transferId: string;
  productId: string;
  quantity: number;
  fromLocationId: string;
  toLocationId: string;
  createdById?: string;
  notes?: string;
}

export interface TransferDiscrepancyInput {
  transferId: string;
  productId: string;
  expectedQuantity: number;
  actualQuantity: number;
  fromLocationId: string;
  toLocationId: string;
  createdById?: string;
  notes?: string;
}

export async function recordTransferDispatch(tx: Tx, input: TransferDispatchInput) {
  assertPositiveQuantity(input.quantity);
  const inventory = await findInventoryOrThrow(tx, input.productId);

  if (inventory.quantity < input.quantity || inventory.available < input.quantity) {
    throw new Error(`Insufficient inventory to transfer out product ${input.productId}`);
  }

  await tx.inventory.update({
    where: { productId: input.productId },
    data: {
      quantity: { decrement: input.quantity },
      available: { decrement: input.quantity },
    },
  });

  await createMovement(tx, {
    productId: input.productId,
    quantity: input.quantity,
    movementType: 'TRANSFER_OUT',
    referenceType: 'Transfer',
    referenceId: input.transferId,
    fromLocationId: input.fromLocationId,
    toLocationId: input.toLocationId,
    createdById: input.createdById,
    notes: input.notes || `Transfer dispatch ${input.transferId}`,
  });
}

export async function recordTransferReceipt(tx: Tx, input: TransferReceiptInput) {
  assertPositiveQuantity(input.quantity);
  const inventory = await tx.inventory.findUnique({ where: { productId: input.productId } });

  if (inventory) {
    await tx.inventory.update({
      where: { productId: input.productId },
      data: {
        quantity: { increment: input.quantity },
        available: { increment: input.quantity },
      },
    });
  } else {
    await tx.inventory.create({
      data: {
        productId: input.productId,
        quantity: input.quantity,
        available: input.quantity,
        reserved: 0,
        costPrice: 0,
      },
    });
  }

  await createMovement(tx, {
    productId: input.productId,
    quantity: input.quantity,
    movementType: 'TRANSFER_IN',
    referenceType: 'Transfer',
    referenceId: input.transferId,
    fromLocationId: input.fromLocationId,
    toLocationId: input.toLocationId,
    createdById: input.createdById,
    notes: input.notes || `Transfer receipt ${input.transferId}`,
  });
}

export async function recordTransferDiscrepancy(tx: Tx, input: TransferDiscrepancyInput) {
  const delta = input.actualQuantity - input.expectedQuantity;

  if (delta === 0) {
    return { discrepancyMovement: null, returnMovement: null, delta: 0 };
  }

  await findInventoryOrThrow(tx, input.productId);

  if (delta > 0) {
    await tx.inventory.update({
      where: { productId: input.productId },
      data: {
        quantity: { increment: delta },
        available: { increment: delta },
      },
    });

    const discrepancyMovement = await createMovement(tx, {
      productId: input.productId,
      quantity: delta,
      movementType: 'TRANSFER_IN',
      referenceType: 'TransferDiscrepancy',
      referenceId: input.transferId,
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      createdById: input.createdById,
      notes: input.notes || `Transfer discrepancy over: ${delta} units`,
    });

    return { discrepancyMovement, returnMovement: null, delta };
  } else {
    const returnDelta = Math.abs(delta);

    await tx.inventory.update({
      where: { productId: input.productId },
      data: {
        quantity: { decrement: returnDelta },
        available: { decrement: returnDelta },
      },
    });

    const returnMovement = await createMovement(tx, {
      productId: input.productId,
      quantity: returnDelta,
      movementType: 'TRANSFER_OUT',
      referenceType: 'TransferDiscrepancy',
      referenceId: input.transferId,
      fromLocationId: input.toLocationId,
      toLocationId: input.fromLocationId,
      createdById: input.createdById,
      notes: input.notes || `Transfer discrepancy short: ${returnDelta} units returned`,
    });

    const discrepancyMovement = await createMovement(tx, {
      productId: input.productId,
      quantity: returnDelta,
      movementType: 'ADJUSTMENT',
      referenceType: 'TransferDiscrepancy',
      referenceId: input.transferId,
      createdById: input.createdById,
      notes: `Transfer discrepancy recorded: ${delta} units`,
    });

    return { discrepancyMovement, returnMovement, delta };
  }
}

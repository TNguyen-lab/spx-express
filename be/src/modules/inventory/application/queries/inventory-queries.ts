import prisma from '../../../../config/db.js';
import { withTransaction } from '../../../shared/transactions.js';
import { recordAdjustmentMovement, type AdjustmentReasonCode } from '../commands/movements/index.js';
import type { Tx } from '../commands/movements/index.js';

export function listInventory() {
  return withTransaction(async (tx) => {
    return tx.inventory.findMany({
      include: { product: true },
      orderBy: { updatedAt: 'desc' },
    });
  });
}

export interface CreateCountSessionInput {
  checkerId: string;
  type?: 'ROUTINE' | 'SPOT_CHECK' | 'ANNUAL';
  notes?: string;
  scope?: {
    productIds?: string[];
    category?: string;
    locationId?: string;
  };
}

export async function createCountSession(input: CreateCountSessionInput) {
  const checkNumber = await generateCheckNumber();

  const productWhere: Record<string, unknown> = {};
  if (input.scope?.productIds && input.scope.productIds.length > 0) {
    productWhere.id = { in: input.scope.productIds };
  }
  if (input.scope?.category) {
    productWhere.category = input.scope.category;
  }

  const products = await withTransaction(async (tx) => {
    return tx.product.findMany({ where: productWhere });
  });

  if (products.length === 0) {
    throw new Error('No products found for the specified scope');
  }

  return withTransaction(async (tx) => {
    const check = await tx.inventoryCheck.create({
      data: {
        checkNumber,
        checkerId: input.checkerId,
        type: input.type || 'ROUTINE',
        notes: input.notes,
        status: 'PENDING',
        scope: input.scope ? JSON.stringify(input.scope) : null,
        items: {
          create: products.map((product) => ({
            productId: product.id,
            systemQty: 0,
            actualQty: 0,
            discrepancy: 0,
          })),
        },
      },
      include: {
        checker: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });

    return check;
  });
}

export interface SubmitCountInput {
  itemId: string;
  actualQty: number;
  reasonCode?: AdjustmentReasonCode;
  notes?: string;
}

export async function submitBlindCount(
  checkId: string,
  userId: string,
  input: SubmitCountInput
) {
  return withTransaction(async (tx) => {
    const check = await tx.inventoryCheck.findUnique({
      where: { id: checkId },
    });

    if (!check || check.status !== 'IN_PROGRESS') {
      throw new Error('Check not found or not in progress');
    }

    const item = await tx.inventoryCheckItem.findUnique({
      where: { id: input.itemId },
      include: { product: true },
    });

    if (!item || item.inventoryCheckId !== checkId) {
      throw new Error('Item not found in this check');
    }

    const discrepancy = input.actualQty - item.systemQty;
    let notes = input.notes || '';
    if (input.reasonCode) {
      notes = `[${input.reasonCode}] ${notes}`.trim();
    }

    const updated = await tx.inventoryCheckItem.update({
      where: { id: input.itemId },
      data: { actualQty: input.actualQty, discrepancy, notes },
    });

    return {
      id: updated.id,
      productId: updated.productId,
      product: item.product,
      countedQty: updated.actualQty,
      discrepancy: updated.discrepancy,
      status: updated.discrepancy !== 0 ? 'HAS_DISCREPANCY' : 'COUNTED',
    };
  });
}

export interface DiscrepancySummary {
  totalItems: number;
  itemsCounted: number;
  itemsWithDiscrepancy: number;
  totalPositiveDiscrepancy: number;
  totalNegativeDiscrepancy: number;
  netDiscrepancy: number;
  requiresApproval: boolean;
}

export async function getDiscrepancySummary(checkId: string): Promise<{
  summary: DiscrepancySummary;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    systemQty: number;
    actualQty: number;
    discrepancy: number;
    notes: string | null;
  }>;
}> {
  const check = await withTransaction(async (tx) => {
    return tx.inventoryCheck.findUnique({
      where: { id: checkId },
      include: {
        checker: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });
  });

  if (!check || check.status !== 'IN_PROGRESS') {
    throw new Error('Check not found or not in progress');
  }

  const itemsWithDiscrepancy = check.items.filter((item) => item.discrepancy !== 0);
  const totalPositiveDiscrepancy = itemsWithDiscrepancy.reduce(
    (sum, item) => sum + Math.max(0, item.discrepancy),
    0
  );
  const totalNegativeDiscrepancy = itemsWithDiscrepancy.reduce(
    (sum, item) => sum + Math.min(0, item.discrepancy),
    0
  );

  const summary: DiscrepancySummary = {
    totalItems: check.items.length,
    itemsCounted: check.items.filter(
      (item) => item.actualQty > 0 || item.discrepancy !== 0
    ).length,
    itemsWithDiscrepancy: itemsWithDiscrepancy.length,
    totalPositiveDiscrepancy,
    totalNegativeDiscrepancy,
    netDiscrepancy: totalPositiveDiscrepancy + totalNegativeDiscrepancy,
    requiresApproval: itemsWithDiscrepancy.length > 0,
  };

  const items = itemsWithDiscrepancy.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    systemQty: item.systemQty,
    actualQty: item.actualQty,
    discrepancy: item.discrepancy,
    notes: item.notes,
  }));

  return { summary, items };
}

export interface ProcessAdjustmentsInput {
  checkId: string;
  userId: string;
  itemReasonCodes?: Record<string, AdjustmentReasonCode>;
  notes?: string;
}

export async function processAdjustments(input: ProcessAdjustmentsInput) {
  return withTransaction(async (tx) => {
    const check = await tx.inventoryCheck.findUnique({
      where: { id: input.checkId },
      include: { items: true },
    });

    if (!check) {
      throw new Error('Check not found');
    }

    if (check.status !== 'IN_PROGRESS') {
      throw new Error('Check is not in progress');
    }

    const hasDiscrepancies = check.items.some((item) => item.discrepancy !== 0);
    if (hasDiscrepancies && !check.approverId) {
      throw new Error('Supervisor approval required before posting adjustments');
    }

    let adjustedItems = 0;

    for (const item of check.items) {
      if (item.discrepancy !== 0) {
        let reasonCode: AdjustmentReasonCode | undefined;
        const notesMatch = item.notes?.match(
          /^\[(DAMAGED|EXPIRED|MISCOUNT|THEFT|OTHER)\]/
        );
        if (notesMatch) {
          reasonCode = notesMatch[1] as AdjustmentReasonCode;
        }
        if (input.itemReasonCodes?.[item.id]) {
          reasonCode = input.itemReasonCodes[item.id];
        }

        await recordAdjustmentMovement(tx as Tx, {
          productId: item.productId,
          systemQuantity: item.systemQty,
          actualQuantity: item.actualQty,
          referenceType: 'InventoryCheck',
          referenceId: check.id,
          createdById: input.userId,
          notes: item.notes || `Adjusted from inventory check ${check.checkNumber}`,
          reasonCode,
        });
        adjustedItems += 1;
      }
    }

    return { adjustedItems };
  });
}

export async function approveCheck(
  checkId: string,
  approverId: string,
  approved: boolean,
  notes?: string
) {
  return withTransaction(async (tx) => {
    const check = await tx.inventoryCheck.findUnique({
      where: { id: checkId },
      include: { items: true },
    });

    if (!check) {
      throw new Error('Check not found');
    }

    if (check.status !== 'IN_PROGRESS') {
      throw new Error('Check is not in progress');
    }

    const hasDiscrepancies = check.items.some((item) => item.discrepancy !== 0);

    if (hasDiscrepancies && !approved) {
      throw new Error(
        'Cannot reject approval when there are discrepancies. Use /recount instead.'
      );
    }

    if (!approved) {
      return { approved: false, checkId };
    }

    const updated = await tx.inventoryCheck.update({
      where: { id: checkId },
      data: {
        approverId,
        approvedAt: new Date(),
        notes: notes ? `${check.notes || ''}\n[APPROVED] ${notes}`.trim() : check.notes,
      },
      include: {
        checker: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });

    return { approved: true, check: updated };
  });
}

export async function initiateRecount(
  checkId: string,
  itemIds: string[],
  notes?: string
) {
  return withTransaction(async (tx) => {
    const check = await tx.inventoryCheck.findUnique({
      where: { id: checkId },
    });

    if (!check) {
      throw new Error('Check not found');
    }

    if (check.status !== 'IN_PROGRESS') {
      throw new Error('Check is not in progress');
    }

    for (const itemId of itemIds) {
      await tx.inventoryCheckItem.update({
        where: { id: itemId },
        data: {
          actualQty: 0,
          discrepancy: 0,
          notes: notes ? `[RECOUNT] ${notes}` : '[RECOUNT]',
        },
      });
    }

    return { checkId, itemIds };
  });
}

export async function completeCheck(checkId: string, notes?: string) {
  return withTransaction(async (tx) => {
    const check = await tx.inventoryCheck.findUnique({
      where: { id: checkId },
      include: { items: true },
    });

    if (!check) {
      throw new Error('Check not found');
    }

    if (!['PENDING', 'IN_PROGRESS'].includes(check.status)) {
      throw new Error('Check already completed or cancelled');
    }

    const hasDiscrepancies = check.items.some((item) => item.discrepancy !== 0);
    if (hasDiscrepancies && !check.approverId) {
      throw new Error('Supervisor approval required before completing check with discrepancies');
    }

    const totalDiscrepancy = check.items.reduce((sum, item) => sum + Math.abs(item.discrepancy), 0);

    const updated = await tx.inventoryCheck.update({
      where: { id: checkId },
      data: {
        status: 'COMPLETED',
        endDate: new Date(),
        notes: notes || check.notes,
      },
    });

    return { check: updated, totalDiscrepancy, itemsChecked: check.items.length, checkNumber: check.checkNumber };
  });
}

async function generateCheckNumber(): Promise<string> {
  const count = await prisma.inventoryCheck.count();
  const num = (count + 1).toString().padStart(5, '0');
  return `CK${new Date().getFullYear()}${num}`;
}

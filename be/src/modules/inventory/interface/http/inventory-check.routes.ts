import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../../../../config/db.js';
import { authenticate, authorize, type AuthRequest } from '../../../../shared/auth/index.js';
import { sendRouteError } from '../../../../shared/errors/index.js';
import { createCountSession } from '../../application/commands/create-count-session.js';
import { startCountSession } from '../../application/commands/start-count-session.js';
import { submitBlindCount } from '../../application/commands/submit-blind-count.js';
import { initiateRecount } from '../../application/commands/initiate-recount.js';
import { approveCheck } from '../../application/commands/approve-check.js';
import { processAdjustments } from '../../application/commands/process-adjustments.js';
import { completeCheck } from '../../application/commands/complete-check.js';
import { getDiscrepancySummary } from '../../application/queries/get-discrepancy-summary.js';
import { listInventory } from '../../application/commands/list-inventory.js';
import type { SubmitCountInput } from '../../application/commands/submit-blind-count.js';

const router = Router();

const createCheckSchema = z.object({
  type: z.enum(['ROUTINE', 'SPOT_CHECK', 'ANNUAL']).optional(),
  notes: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  category: z.string().optional(),
  locationId: z.string().optional(),
});

const countItemSchema = z.object({
  itemId: z.string(),
  actualQty: z.number().int().min(0),
  reasonCode: z.enum(['DAMAGED', 'EXPIRED', 'MISCOUNT', 'THEFT', 'OTHER']).optional(),
  notes: z.string().optional(),
});

const approveCheckSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional(),
});

const adjustCheckSchema = z.object({
  itemReasonCodes: z.record(z.string(), z.enum(['DAMAGED', 'EXPIRED', 'MISCOUNT', 'THEFT', 'OTHER'])).optional(),
  notes: z.string().optional(),
});

async function listChecks(req: AuthRequest, res: Response) {
  const { status, type, page = '1', limit = '20' } = req.query;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const checks = await prisma.inventoryCheck.findMany({
    where,
    include: {
      checker: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (parseInt(page as string) - 1) * parseInt(limit as string),
    take: parseInt(limit as string),
  });

  const total = await prisma.inventoryCheck.count({ where });
  res.json({ checks, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}

router.get('/inventory-checks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await listChecks(req, res);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get('/inventory-checks/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const check = await prisma.inventoryCheck.findUnique({
      where: { id: req.params.id },
      include: {
        checker: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });
    if (!check) {
      res.status(404).json({ error: 'Check not found' });
      return;
    }
    res.json({ check });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get('/inventory-checks/:id/blind-count', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const check = await prisma.inventoryCheck.findUnique({
      where: { id: req.params.id },
      include: {
        checker: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });

    if (!check) {
      res.status(404).json({ error: 'Check not found' });
      return;
    }

    if (check.status !== 'IN_PROGRESS') {
      res.status(400).json({ error: 'Check is not in progress' });
      return;
    }

    const blindItems = check.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      product: item.product,
      countedQty: item.actualQty,
      status: item.discrepancy !== 0 ? 'HAS_DISCREPANCY' : item.actualQty > 0 ? 'COUNTED' : 'PENDING',
    }));

    res.json({ items: blindItems, checkNumber: check.checkNumber });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inventory-checks', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createCheckSchema.parse(req.body);
    const check = await createCountSession({
      checkerId: req.user!.id,
      type: data.type,
      notes: data.notes,
      scope: {
        productIds: data.productIds,
        category: data.category,
        locationId: data.locationId,
      },
    });
    res.status(201).json({ check });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inventory-checks/:id/start', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const check = await startCountSession(req.params.id, req.user!.id);
    res.json({ check });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inventory-checks/:id/count', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
      const data = countItemSchema.parse(req.body) as SubmitCountInput;
      const item = await submitBlindCount(req.params.id, req.user!.id, data);
      res.json({ item });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get('/inventory', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const inventory = await listInventory();
    res.json({ inventory });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inventory-checks/:id/recount', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { itemIds, notes } = req.body;
    const result = await initiateRecount(req.params.id, itemIds, notes);
    res.json({ message: 'Recount initiated', itemIds: result.itemIds });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inventory-checks/:id/review', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await getDiscrepancySummary(req.params.id);
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inventory-checks/:id/approve', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = approveCheckSchema.parse(req.body);
    const result = await approveCheck(req.params.id, req.user!.id, data.approved, data.notes);
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inventory-checks/:id/adjust', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = adjustCheckSchema.parse(req.body);
    const result = await processAdjustments({
      checkId: req.params.id,
      userId: req.user!.id,
      itemReasonCodes: data.itemReasonCodes,
      notes: data.notes,
    });
    res.json({ message: 'Inventory adjusted', adjustedItems: result.adjustedItems });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inventory-checks/:id/complete', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { notes } = req.body;
    const result = await completeCheck(req.params.id, req.user!.id, notes);
    res.json({ check: result.check, summary: { totalDiscrepancy: result.totalDiscrepancy, itemsChecked: result.itemsChecked } });
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

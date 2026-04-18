import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, type AuthRequest } from '../../../../shared/auth/index.js';
import { withTransaction } from '../../../../shared/transactions/index.js';
import { sendRouteError } from '../../../../shared/errors/index.js';
import { listPackings } from '../../application/queries/list-packings.js';
import { getPacking } from '../../application/queries/get-packing.js';
import { startPacking } from '../../application/commands/start-packing.js';
import { recordItemPacked } from '../../application/commands/record-item-packed.js';
import { markPacked } from '../../application/commands/mark-packed.js';
import { sealPacking } from '../../application/commands/seal-packing.js';
import { moveToConveyor } from '../../application/commands/move-to-conveyor.js';
import { moveToSorting } from '../../application/commands/move-to-sorting.js';
import { updateGrouping } from '../../application/commands/update-grouping.js';
import { cancelPacking } from '../../application/commands/cancel-packing.js';
import { serializePacking, serializePackings } from './serializer.js';

const router = Router();

const listQuerySchema = z.object({
  status: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
});

const itemPackedSchema = z.object({
  itemId: z.string().min(1),
  packedQty: z.number().int().min(1).default(1),
});

const packedSchema = z.object({
  cartonId: z.string().optional(),
  palletId: z.string().optional(),
  notes: z.string().optional(),
});

const sealSchema = z.object({
  weight: z.number().optional(),
  dimension: z.string().optional(),
});

const cancelSchema = z.object({
  reason: z.string().optional(),
});

const updateGroupingSchema = z.object({
  cartonId: z.string().optional(),
  palletId: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/packings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page, limit } = listQuerySchema.parse(req.query);
    const result = await listPackings({ status, page, limit });
    res.json(serializePackings(result.packings, result.total, result.page, result.limit));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get('/packings/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const packing = await getPacking(req.params.id);
    if (!packing) {
      res.status(404).json({ error: 'Packing not found' });
      return;
    }
    res.json(serializePacking(packing));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/packings/:id/start', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await withTransaction((tx) => startPacking(tx, { packingId: req.params.id, packerId: req.user!.id }));
    res.json(serializePacking(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/packings/:id/item-packed', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = itemPackedSchema.parse(req.body);
    const result = await withTransaction((tx) => recordItemPacked(tx, { packingId: req.params.id, itemId: data.itemId, packedQty: data.packedQty, packerId: req.user!.id }));
    res.json(serializePacking(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/packings/:id/packed', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = packedSchema.parse(req.body);
    const result = await withTransaction((tx) => markPacked(tx, { packingId: req.params.id, cartonId: data.cartonId, palletId: data.palletId, notes: data.notes, packerId: req.user!.id }));
    res.json(serializePacking(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/packings/:id/seal', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = sealSchema.parse(req.body);
    const result = await withTransaction((tx) => sealPacking(tx, { packingId: req.params.id, weight: data.weight, dimension: data.dimension, packerId: req.user!.id }));
    res.json(serializePacking(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/packings/:id/on-conveyor', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await withTransaction((tx) => moveToConveyor(tx, { packingId: req.params.id, staffId: req.user!.id }));
    res.json(serializePacking(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/packings/:id/move-to-sorting', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await withTransaction((tx) => moveToSorting(tx, { packingId: req.params.id, staffId: req.user!.id }));
    res.json({ sorting: result, message: 'Moved to sorting' });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/packings/:id/cancel', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = cancelSchema.parse(req.body);
    const result = await withTransaction((tx) => cancelPacking(tx, { packingId: req.params.id, reason: data.reason, staffId: req.user!.id }));
    res.json({ packing: result, message: 'Packing cancelled' });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/packings/:id/update-grouping', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = updateGroupingSchema.parse(req.body);
    const result = await withTransaction((tx) => updateGrouping(tx, { packingId: req.params.id, cartonId: data.cartonId, palletId: data.palletId, notes: data.notes, staffId: req.user!.id }));
    res.json(serializePacking(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

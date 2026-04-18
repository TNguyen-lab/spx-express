import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../../../../middleware/auth.middleware.js';
import { sendRouteError } from '../../../../modules/shared/errors.js';
import { withTransaction } from '../../../../modules/shared/transactions.js';
import { listSortings } from '../../application/queries/list-sortings.js';
import { getSorting } from '../../application/queries/get-sorting.js';
import { startSorting } from '../../application/commands/start-sorting.js';
import { qcCheck } from '../../application/commands/qc-check.js';
import { assignRoute } from '../../application/commands/assign-route.js';
import { assignZone } from '../../application/commands/assign-zone.js';
import { classifyPacking } from '../../application/commands/classify-packing.js';
import { handleException } from '../../application/commands/handle-exception.js';
import { completeSorting } from '../../application/commands/complete-sorting.js';
import { qcCheckDto } from '../dto/qc-check.dto.js';
import { classifyDto } from '../dto/classify.dto.js';

const router = Router();

const listQuerySchema = z.object({
  status: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
});

const routeSchema = z.object({ route: z.string().min(1), notes: z.string().optional() });
const zoneSchema = z.object({ zone: z.string().min(1), notes: z.string().optional() });
const exceptionSchema = z.object({ exceptionType: z.enum(['REPACK', 'DAMAGED', 'MISSING_LABEL', 'WRONG_ADDRESS', 'OTHER']), notes: z.string().optional() });
const completeSchema = z.object({ carrier: z.string().optional() });

router.get('/sortings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page, limit } = listQuerySchema.parse(req.query);
    const result = await listSortings({ status, page, limit });
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get('/sortings/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sorting = await getSorting(req.params.id);
    if (!sorting) {
      res.status(404).json({ error: 'Sorting not found' });
      return;
    }
    res.json({ sorting });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/sortings/:id/start', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await withTransaction(async () => startSorting({ sortingId: req.params.id, sorterId: req.user!.id }));
    res.json({ sorting: result });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/sortings/:id/qc-check', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = qcCheckDto.parse(req.body);
    const result = await withTransaction(async () => qcCheck({ sortingId: req.params.id, passed: data.passed, notes: data.notes, staffId: req.user!.id }));
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/sortings/:id/assign-route', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = routeSchema.parse(req.body);
    const result = await withTransaction(async () => assignRoute({ sortingId: req.params.id, route: data.route, notes: data.notes, staffId: req.user!.id }));
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/sortings/:id/assign-zone', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = zoneSchema.parse(req.body);
    const result = await withTransaction(async () => assignZone({ sortingId: req.params.id, zone: data.zone, notes: data.notes, staffId: req.user!.id }));
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/sortings/:id/classify', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = classifyDto.parse(req.body);
    const result = await withTransaction(async () => classifyPacking({ sortingId: req.params.id, sizeCategory: data.sizeCategory, zone: data.zone, notes: data.notes, staffId: req.user!.id }));
    res.json({ sorting: result });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/sortings/:id/exception', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = exceptionSchema.parse(req.body);
    const result = await withTransaction(async () => handleException({ sortingId: req.params.id, exceptionType: data.exceptionType, notes: data.notes, staffId: req.user!.id }));
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/sortings/:id/complete', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = completeSchema.parse(req.body);
    const result = await withTransaction(async () => completeSorting({ sortingId: req.params.id, carrier: data.carrier, staffId: req.user!.id }));
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

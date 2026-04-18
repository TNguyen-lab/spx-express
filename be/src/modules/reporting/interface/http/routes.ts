import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, type AuthRequest } from '../../../../shared/auth/index.js';
import { sendRouteError } from '../../../../shared/errors/index.js';
import { closeMonthlyReport, getMonthlyReportSnapshot, replayMonthlyReport } from '../../application/queries/monthly-report.js';

const router = Router();

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  warehouseLocationId: z.string().optional(),
  productId: z.string().optional(),
  category: z.string().optional(),
});

function parseFilters(input: unknown) {
  const parsed = schema.parse(input);

  return {
    month: parsed.month,
    warehouseLocationId: parsed.warehouseLocationId,
    productId: parsed.productId,
    category: parsed.category,
  };
}

function respond(res: Response, snapshot: { reportKey: string; sourceHash: string; sourceMovementCount: number; payload: unknown }) {
  res.json({ report: snapshot.payload, meta: { reportKey: snapshot.reportKey, sourceHash: snapshot.sourceHash, sourceMovementCount: snapshot.sourceMovementCount } });
}

router.get('/reports/monthly', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const filters = parseFilters(req.query);
    const snapshot = await getMonthlyReportSnapshot(filters);
    if (!snapshot) {
      res.status(404).json({ error: 'Monthly report not found. Close the period first.' });
      return;
    }
    respond(res, snapshot);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/reports/monthly/close', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const filters = parseFilters(req.body);
    const snapshot = await closeMonthlyReport(filters, req.user?.id);
    res.status(201).json({ report: snapshot.payload, meta: { reportKey: snapshot.reportKey, sourceHash: snapshot.sourceHash, sourceMovementCount: snapshot.sourceMovementCount } });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/reports/monthly/replay', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const filters = parseFilters(req.body);
    const snapshot = await replayMonthlyReport(filters, req.user?.id);
    respond(res, snapshot);
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

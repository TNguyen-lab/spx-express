import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, type AuthRequest } from '../../../../shared/auth/index.js';
import { sendRouteError } from '../../../../shared/errors/index.js';
import { createInbound } from '../../application/commands/create-inbound.js';
import {
  receiveItems,
} from '../../application/commands/receive-items.js';
import { startQualityCheck } from '../../application/commands/start-quality-check.js';
import { passQC } from '../../application/commands/pass-qc.js';
import { failQC } from '../../application/commands/fail-qc.js';
import { recheckAfterFailure } from '../../application/commands/recheck-after-failure.js';
import { createBarcodes } from '../../application/commands/create-barcodes.js';
import { assignLocation } from '../../application/commands/assign-location.js';
import { autoAssignLocations } from '../../application/commands/auto-assign-locations.js';
import { confirmReceipt } from '../../application/commands/confirm-receipt.js';
import { completeInbound } from '../../application/commands/complete-inbound.js';
import { cancelInbound } from '../../application/commands/cancel-inbound.js';
import { listInbounds } from '../../application/queries/list-inbounds.js';
import { getInbound } from '../../application/queries/get-inbound.js';
import { serializeInbound, serializeInbounds } from './serializer.js';

const router = Router();

const createInboundSchema = z.object({
  purchaseOrderId: z.string().min(1).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product ID là bắt buộc. Product ID is required.'),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
  })).min(1, 'Phải có ít nhất 1 sản phẩm. At least 1 item is required.'),
});

const qcSchema = z.object({
  passed: z.boolean(),
  reason: z.string().optional(),
  itemUpdates: z.array(z.object({
    id: z.string(),
    receivedQty: z.number().int().min(0).optional(),
    damageQty: z.number().int().min(0).optional(),
  })).optional(),
});

const assignLocationSchema = z.object({
  itemId: z.string(),
  locationId: z.string(),
});

router.get('/inbounds', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const result = await listInbounds({
      status: status as string | undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
    res.json(serializeInbounds(result.inbounds, result.total, result.page, result.limit));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get('/inbounds/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const inbound = await getInbound(req.params.id);
    if (!inbound) {
      res.status(404).json({ error: 'Inbound not found' });
      return;
    }
    res.json(serializeInbound(inbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inbounds', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createInboundSchema.parse(req.body);
    const inbound = await createInbound({
      purchaseOrderId: data.purchaseOrderId,
      notes: data.notes,
      items: data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      })),
      userId: req.user!.id,
    });
    res.status(201).json(serializeInbound(inbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inbounds/:id/receive', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const inbound = await receiveItems(req.params.id, req.user!.role as never, req.user!.id);
    res.json(serializeInbound(inbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inbounds/:id/quality-check', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const inbound = await startQualityCheck(req.params.id, req.user!.role as never, req.user!.id);
    res.json(serializeInbound(inbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inbounds/:id/qc', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { passed, reason, itemUpdates } = qcSchema.parse(req.body);
    const inbound = passed
      ? await passQC(req.params.id, req.user!.role as never, req.user!.id, itemUpdates?.map((item) => ({
        id: item.id,
        receivedQty: item.receivedQty,
        damageQty: item.damageQty,
      })))
      : await failQC(req.params.id, req.user!.role as never, req.user!.id, reason);
    res.json(serializeInbound(inbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inbounds/:id/recheck', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const inbound = await recheckAfterFailure(req.params.id, req.user!.role as never, req.user!.id);
    res.json(serializeInbound(inbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inbounds/:id/create-barcodes', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const inbound = await createBarcodes(req.params.id, req.user!.role as never, req.user!.id);
    res.json(serializeInbound(inbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inbounds/:id/assign-location', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, locationId } = assignLocationSchema.parse(req.body);
    const inbound = await assignLocation(req.params.id, req.user!.role as never, req.user!.id, itemId, locationId);
    res.json(serializeInbound(inbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inbounds/:id/auto-assign-location', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const inbound = await autoAssignLocations(req.params.id, req.user!.role as never, req.user!.id);
    res.json(serializeInbound(inbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inbounds/:id/confirm-receipt', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const inbound = await confirmReceipt(req.params.id, req.user!.role as never, req.user!.id);
    res.json(serializeInbound(inbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inbounds/:id/complete', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const inbound = await completeInbound(req.params.id, req.user!.role as never, req.user!.id);
    res.json(serializeInbound(inbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/inbounds/:id/cancel', authenticate, authorize('QUALITY', 'WAREHOUSE_DIRECTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const inbound = await cancelInbound(req.params.id, req.user!.role as never, req.user!.id, reason);
    res.json(serializeInbound(inbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

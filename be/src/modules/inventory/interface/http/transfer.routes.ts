import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, type AuthRequest } from '../../../../shared/auth/index.js';
import { sendRouteError } from '../../../../shared/errors/index.js';
import { withTransaction } from '../../../../shared/transactions/index.js';
import { createTransferRequest } from '../../application/commands/transfers/create-transfer-request.js';
import { approveTransfer } from '../../application/commands/transfers/approve-transfer.js';
import { dispatchTransfer } from '../../application/commands/transfers/dispatch-transfer.js';
import { receiveTransfer } from '../../application/commands/transfers/receive-transfer.js';
import { handleTransferDiscrepancy } from '../../application/commands/transfers/handle-transfer-discrepancy.js';
import { cancelTransfer } from '../../application/commands/transfers/cancel-transfer.js';
import { resolveReconciliation } from '../../application/commands/transfers/resolve-reconciliation.js';
import { listTransfers } from '../../application/queries/list-transfers.js';
import { getTransferWithContext } from '../../application/commands/transfers/index.js';

const router = Router();

const listQuerySchema = z.object({
  status: z.string().optional(),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
});

const transferItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
});

type TransferItemInput = { productId: string; quantity: number };
type DispatchItemInput = { productId: string; quantity: number };
type ReceiveItemInput = { productId: string; receivedQuantity: number };
type ExceptionItemInput = { productId: string; expectedQuantity: number; actualQuantity: number };

const createTransferSchema = z.object({
  items: z.array(transferItemSchema).min(1, 'At least 1 item is required'),
  fromLocationId: z.string().min(1, 'From location ID is required'),
  toLocationId: z.string().min(1, 'To location ID is required'),
  notes: z.string().optional(),
});

const approveTransferSchema = z.object({ notes: z.string().optional() });
const dispatchTransferSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
});
const receiveTransferSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1), receivedQuantity: z.number().int().min(0) })).min(1),
  notes: z.string().optional(),
});
const exceptionSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1), expectedQuantity: z.number().int().positive(), actualQuantity: z.number().int().min(0) })).min(1),
  notes: z.string().optional(),
});
const cancelTransferSchema = z.object({ reason: z.string().optional() });
const resolveReconciliationSchema = z.object({
  resolution: z.enum(['RESOLVED_SOURCE', 'RESOLVED_DESTINATION', 'WRITTEN_OFF']),
  notes: z.string().optional(),
});

router.get('/transfers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, fromLocationId, toLocationId, page, limit } = listQuerySchema.parse(req.query);
    const result = await listTransfers({ status, fromLocationId, toLocationId, page, limit });
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get('/transfers/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await getTransferWithContext(req.params.id);
    if (!result) {
      res.status(404).json({ error: 'Transfer not found' });
      return;
    }
    res.json({ transfer: result });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/transfers/request', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createTransferSchema.parse(req.body);
    const items: TransferItemInput[] = data.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
    const payload: Parameters<typeof createTransferRequest>[1] = {
      items,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      notes: data.notes,
      requestedById: req.user!.id,
    };
    const result = await withTransaction(async (tx) => createTransferRequest(tx, payload));
    res.status(201).json({ transferId: result.id, transferNumber: result.transferNumber, status: result.status, message: 'Transfer request created' });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/transfers/:id/approve', authenticate, authorize('WAREHOUSE_DIRECTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = approveTransferSchema.parse(req.body);
    const result = await withTransaction(async (tx) => approveTransfer(tx, { transferId: req.params.id, approvedById: req.user!.id, notes: data.notes }));
    res.json({ transferId: result.id, transferNumber: result.transferNumber, status: result.status, message: 'Transfer approved and ready for dispatch' });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/transfers/:id/dispatch', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = dispatchTransferSchema.parse(req.body);
    const result = await withTransaction(async (tx) => dispatchTransfer(tx, { transferId: req.params.id, items: data.items as DispatchItemInput[], staffId: req.user!.id }));
    res.json({ transferId: result.id, transferNumber: result.transferNumber, status: result.status, message: 'Transfer dispatched from source location' });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/transfers/:id/receive', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = receiveTransferSchema.parse(req.body);
    const result = await withTransaction(async (tx) => receiveTransfer(tx, { transferId: req.params.id, items: data.items as ReceiveItemInput[], notes: data.notes, staffId: req.user!.id }));
    res.json({ transferId: result.id, transferNumber: result.transferNumber, status: result.status, message: 'Transfer received at destination' });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/transfers/:id/exception', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = exceptionSchema.parse(req.body);
    const result = await withTransaction(async (tx) => handleTransferDiscrepancy(tx, { transferId: req.params.id, items: data.items as ExceptionItemInput[], notes: data.notes, staffId: req.user!.id }));
    const hasDiscrepancy = result.status === 'EXCEPTION';
    res.json({ transferId: result.id, transferNumber: result.transferNumber, status: result.status, hasDiscrepancy, message: hasDiscrepancy ? 'Transfer has discrepancy - reconciliation required' : 'Transfer discrepancy recorded', reconciliations: result.reconciliations });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/transfers/:id/cancel', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = cancelTransferSchema.parse(req.body);
    const result = await withTransaction(async (tx) => cancelTransfer(tx, { transferId: req.params.id, reason: data.reason, staffId: req.user!.id }));
    res.json({ transferId: result.id, transferNumber: result.transferNumber, status: result.status, message: 'Transfer cancelled and inventory restored' });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/transfers/reconciliations/:id/resolve', authenticate, authorize('WAREHOUSE_DIRECTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = resolveReconciliationSchema.parse(req.body);
    const result = await withTransaction(async (tx) => resolveReconciliation(tx, { reconciliationId: req.params.id, resolution: data.resolution, notes: data.notes, staffId: req.user!.id }));
    res.json({ reconciliationId: result.id, status: 'resolved', message: 'Reconciliation resolved' });
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

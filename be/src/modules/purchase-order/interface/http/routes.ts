import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, type AuthRequest } from '../../../../shared/auth/index.js';
import { sendRouteError } from '../../../../shared/errors/index.js';
import { createPurchaseOrder } from '../../application/commands/create-purchase-order.js';
import { sendToAccounting } from '../../application/commands/send-to-accounting.js';
import { confirmAccounting } from '../../application/commands/confirm-accounting.js';
import { approvePurchaseOrder } from '../../application/commands/approve-purchase-order.js';
import { rejectPurchaseOrder } from '../../application/commands/reject-purchase-order.js';
import { sendToSupplier } from '../../application/commands/send-to-supplier.js';
import { supplierResponse } from '../../application/commands/supplier-response.js';
import { completePurchaseOrder } from '../../application/commands/complete-purchase-order.js';
import { cancelPurchaseOrder } from '../../application/commands/cancel-purchase-order.js';
import { getPurchaseOrder } from '../../application/queries/get-purchase-order.js';
import { listPurchaseOrders } from '../../application/queries/list-purchase-orders.js';
import { serializePurchaseOrder, serializePurchaseOrders } from './serializer.js';
import type { PurchaseOrderRole } from '../../domain/aggregates/purchase-order-policy.js';

const router = Router();

const listQuerySchema = z.object({
  status: z.string().optional(),
  supplierId: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
});

const createPOSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().positive('Quantity must be positive'),
    unitPrice: z.number().positive('Unit price must be positive'),
  })).min(1, 'At least 1 item is required'),
});

const notesSchema = z.object({
  notes: z.string().optional(),
});

const supplierResponseSchema = z.object({
  confirmed: z.boolean(),
});

router.get('/orders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, supplierId, page, limit } = listQuerySchema.parse(req.query);
    const result = await listPurchaseOrders({ status, supplierId, page, limit });
    res.json(serializePurchaseOrders(result.orders, result.total, result.page, result.limit));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get('/orders/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await getPurchaseOrder(req.params.id);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(serializePurchaseOrder(order));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/orders', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createPOSchema.parse(req.body);
    const order = await createPurchaseOrder({
      supplierId: data.supplierId,
      expectedDate: data.expectedDate,
      notes: data.notes,
      items: data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      userId: req.user!.id,
    });

    res.status(201).json(serializePurchaseOrder(order));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/orders/:id/send-to-accounting', authenticate, authorize('QUALITY', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const updated = await sendToAccounting(req.params.id, req.user!.role as PurchaseOrderRole, req.user!.id);
    res.json(serializePurchaseOrder(updated));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/orders/:id/confirm-accounting', authenticate, authorize('ACCOUNTING', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = notesSchema.parse(req.body);
    const updated = await confirmAccounting(req.params.id, req.user!.role as PurchaseOrderRole, req.user!.id, data.notes);
    res.json(serializePurchaseOrder(updated));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/orders/:id/approve', authenticate, authorize('WAREHOUSE_DIRECTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = notesSchema.parse(req.body);
    const updated = await approvePurchaseOrder(req.params.id, req.user!.role as PurchaseOrderRole, req.user!.id, data.notes);
    res.json(serializePurchaseOrder(updated));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/orders/:id/reject', authenticate, authorize('WAREHOUSE_DIRECTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = notesSchema.parse(req.body);
    const updated = await rejectPurchaseOrder(req.params.id, req.user!.role as PurchaseOrderRole, req.user!.id, data.notes);
    res.json(serializePurchaseOrder(updated));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/orders/:id/send-to-supplier', authenticate, authorize('ADMIN', 'WAREHOUSE_DIRECTOR', 'ACCOUNTING'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await sendToSupplier(req.params.id, req.user!.role as PurchaseOrderRole, req.user!.id);
    res.json(serializePurchaseOrder(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/orders/:id/supplier-response', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = supplierResponseSchema.parse(req.body);
    const updated = await supplierResponse(req.params.id, req.user!.role as PurchaseOrderRole, req.user!.id, data.confirmed);
    res.json(serializePurchaseOrder(updated));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.delete('/orders/:id', authenticate, authorize('QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const updated = await cancelPurchaseOrder(req.params.id, req.user!.role as PurchaseOrderRole, req.user!.id);
    res.json(serializePurchaseOrder(updated));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/orders/:id/complete', authenticate, authorize('ADMIN', 'ACCOUNTING'), async (req: AuthRequest, res: Response) => {
  try {
    const updated = await completePurchaseOrder(req.params.id, req.user!.role as PurchaseOrderRole, req.user!.id);
    res.json(serializePurchaseOrder(updated));
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

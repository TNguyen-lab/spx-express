import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, type AuthRequest } from '../../../../shared/auth/index.js';
import { sendRouteError } from '../../../../shared/errors/index.js';
import { createOutbound } from '../../application/commands/create-outbound.js';
import { checkInventory } from '../../application/commands/check-inventory.js';
import { confirmInventorySufficient } from '../../application/commands/confirm-inventory-sufficient.js';
import { markInventoryInsufficient } from '../../application/commands/mark-inventory-insufficient.js';
import { assignPicking } from '../../application/commands/assign-picking.js';
import { assignPicker } from '../../application/commands/assign-picker.js';
import { scanItem } from '../../application/commands/scan-item.js';
import { confirmPickedCorrect } from '../../application/commands/confirm-picked-correct.js';
import { markPickedWrong } from '../../application/commands/mark-picked-wrong.js';
import { rescanItem } from '../../application/commands/rescan-item.js';
import { putInCart } from '../../application/commands/put-in-cart.js';
import { printSlip } from '../../application/commands/print-slip.js';
import { moveToPacking } from '../../application/commands/move-to-packing.js';
import { getOutbound } from '../../application/queries/get-outbound.js';
import { listOutbounds } from '../../application/queries/list-outbounds.js';
import { serializeOutbound, serializeOutbounds } from './serializer.js';
import { createOutboundSchema, assignPickerSchema } from '../../dto/create-outbound.dto.js';
import { type OutboundRole } from '../../domain/aggregates/outbound-policy.js';

const router = Router();

const listQuerySchema = z.object({
  status: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
});

const scanItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  barcode: z.string().min(1, 'Barcode is required'),
});

const pickCorrectSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  pickedQty: z.number().int().positive('Picked quantity must be positive'),
});

const pickWrongSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
});

router.get('/outbounds', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page, limit } = listQuerySchema.parse(req.query);
    const result = await listOutbounds({ status, page, limit });
    res.json(serializeOutbounds(result.outbounds, result.total, result.page, result.limit));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get('/outbounds/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const outbound = await getOutbound(req.params.id);
    if (!outbound) {
      res.status(404).json({ error: 'Outbound not found' });
      return;
    }

    res.json(serializeOutbound(outbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds', authenticate, authorize('ADMIN', 'STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createOutboundSchema.parse(req.body);
    const outbound = await createOutbound({
      orderRef: data.orderRef,
      notes: data.notes,
      items: data.items,
      userId: req.user!.id,
    });
    res.status(201).json(serializeOutbound(outbound));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds/:id/check-inventory', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await checkInventory(req.params.id, req.user!.role as OutboundRole, req.user!.id);
    res.json(serializeOutbound(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds/:id/confirm-sufficient', authenticate, authorize('WAREHOUSE_DIRECTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await confirmInventorySufficient(req.params.id, req.user!.role as OutboundRole, req.user!.id);
    res.json(serializeOutbound(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds/:id/mark-insufficient', authenticate, authorize('WAREHOUSE_DIRECTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await markInventoryInsufficient(req.params.id, req.user!.role as OutboundRole, req.user!.id);
    res.json(serializeOutbound(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds/:id/assign-picking', authenticate, authorize('WAREHOUSE_DIRECTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await assignPicking(req.params.id, req.user!.role as OutboundRole, req.user!.id);
    res.json(serializeOutbound(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds/:id/assign-picker', authenticate, authorize('WAREHOUSE_DIRECTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = assignPickerSchema.parse(req.body);
    const result = await assignPicker(req.params.id, data.pickerId, req.user!.role as OutboundRole, req.user!.id);
    res.json(serializeOutbound(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds/:id/scan-item', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = scanItemSchema.parse(req.body);
    const result = await scanItem(req.params.id, data.productId, data.barcode, req.user!.role as OutboundRole, req.user!.id);
    res.json(serializeOutbound(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds/:id/pick-correct', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = pickCorrectSchema.parse(req.body);
    const result = await confirmPickedCorrect(req.params.id, data.itemId, data.pickedQty, req.user!.role as OutboundRole, req.user!.id);
    res.json(serializeOutbound(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds/:id/pick-wrong', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = pickWrongSchema.parse(req.body);
    const result = await markPickedWrong(req.params.id, data.itemId, req.user!.role as OutboundRole, req.user!.id);
    res.json({ ...serializeOutbound(result), message: 'Item picked wrong, please rescan' });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds/:id/rescan', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await rescanItem(req.params.id, req.user!.role as OutboundRole, req.user!.id);
    res.json(serializeOutbound(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds/:id/put-in-cart', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await putInCart(req.params.id, req.user!.role as OutboundRole, req.user!.id);
    res.json(serializeOutbound(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds/:id/print-slip', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await printSlip(req.params.id, req.user!.role as OutboundRole, req.user!.id);
    res.json(serializeOutbound(result));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/outbounds/:id/move-to-packing', authenticate, authorize('STAFF', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await moveToPacking(req.params.id, req.user!.role as OutboundRole, req.user!.id);
    res.json({ outbound: result.outbound, packing: result.packing, phieu: result.phieu });
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, type AuthRequest } from '../../../../shared/auth/index.js';
import { sendRouteError } from '../../../../shared/errors/index.js';
import { selectCarrier } from '../../application/commands/select-carrier.js';
import { createShipment } from '../../application/commands/create-shipment.js';
import { createTracking } from '../../application/commands/create-tracking.js';
import { markPickedUp } from '../../application/commands/mark-picked-up.js';
import { markInTransit } from '../../application/commands/mark-in-transit.js';
import { markOutForDelivery } from '../../application/commands/mark-out-for-delivery.js';
import { markDelivered } from '../../application/commands/mark-delivered.js';
import { markFailed } from '../../application/commands/mark-failed.js';
import { initiateReturn } from '../../application/commands/initiate-return.js';
import { retryDelivery } from '../../application/commands/retry-delivery.js';
import { confirmDispatch } from '../../application/commands/confirm-dispatch.js';
import { recordProofOfDelivery } from '../../application/commands/record-proof-of-delivery.js';
import { getShipment } from '../../application/queries/get-shipment.js';
import { listShipments } from '../../application/queries/list-shipments.js';
import { serializeShipment, serializeShipments } from './serializer.js';

const router = Router();

const listQuerySchema = z.object({
  status: z.string().optional(),
  carrier: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
});

const createShipmentSchema = z.object({
  sortingId: z.string().min(1, 'Sorting ID is required'),
  carrier: z.string().min(1, 'Carrier is required').optional(),
});

const selectCarrierSchema = z.object({ carrier: z.string().min(1, 'Carrier is required') });
const createTrackingSchema = z.object({ trackingNumber: z.string().min(1, 'Tracking number is required') });
const deliverSchema = z.object({ notes: z.string().optional(), recipientName: z.string().optional() });
const failedSchema = z.object({ reason: z.string().min(1, 'Reason is required'), failureType: z.enum(['ADDRESS_ISSUE', 'RECIPIENT_UNAVAILABLE', 'REFUSED', 'OTHER']).optional() });
const returnSchema = z.object({ returnNotes: z.string().optional() });
const proofOfDeliverySchema = z.object({ recipientName: z.string().optional(), recipientSignature: z.string().optional(), deliveryPhoto: z.string().optional(), notes: z.string().optional() });
const notesSchema = z.object({ notes: z.string().optional() });

router.get('/shipments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, carrier, page, limit } = listQuerySchema.parse(req.query);
    const result = await listShipments({ status, carrier, page, limit });
    res.json(serializeShipments(result.shipments, result.total, result.page, result.limit));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get('/shipments/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const shipment = await getShipment(req.params.id);
    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }
    res.json(serializeShipment(shipment));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/shipments', authenticate, authorize('ADMIN', 'STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createShipmentSchema.parse(req.body);
    const shipment = await createShipment({
      sortingId: data.sortingId,
      shipperId: req.user!.id,
      carrier: data.carrier,
      userId: req.user!.id,
    });
    res.status(201).json(serializeShipment(shipment));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/shipments/:id/select-carrier', authenticate, authorize('ADMIN', 'STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const data = selectCarrierSchema.parse(req.body);
    const shipment = await selectCarrier({ shipmentId: req.params.id, carrier: data.carrier, staffId: req.user!.id });
    res.json(serializeShipment(shipment));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/shipments/:id/create-tracking', authenticate, authorize('ADMIN', 'STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createTrackingSchema.parse(req.body);
    const shipment = await createTracking({ shipmentId: req.params.id, trackingNumber: data.trackingNumber, staffId: req.user!.id });
    res.json(serializeShipment(shipment));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/shipments/:id/pickup', authenticate, authorize('DRIVER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const shipment = await markPickedUp({ shipmentId: req.params.id, staffId: req.user!.id });
    res.json(serializeShipment(shipment));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/shipments/:id/in-transit', authenticate, authorize('DRIVER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const shipment = await markInTransit({ shipmentId: req.params.id, staffId: req.user!.id });
    res.json(serializeShipment(shipment));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/shipments/:id/out-for-delivery', authenticate, authorize('DRIVER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const shipment = await markOutForDelivery({ shipmentId: req.params.id, staffId: req.user!.id });
    res.json(serializeShipment(shipment));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/shipments/:id/deliver', authenticate, authorize('DRIVER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = deliverSchema.parse(req.body);
    const result = await markDelivered({ shipmentId: req.params.id, notes: data.notes, recipientName: data.recipientName, staffId: req.user!.id });
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/shipments/:id/failed', authenticate, authorize('DRIVER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = failedSchema.parse(req.body);
    const result = await markFailed({ shipmentId: req.params.id, reason: data.reason, failureType: data.failureType, staffId: req.user!.id });
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/shipments/:id/return', authenticate, authorize('DRIVER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = returnSchema.parse(req.body);
    const result = await initiateReturn({ shipmentId: req.params.id, returnNotes: data.returnNotes, staffId: req.user!.id });
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/shipments/:id/retry-delivery', authenticate, authorize('DRIVER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await retryDelivery({ shipmentId: req.params.id, staffId: req.user!.id });
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/shipments/:id/dispatch-confirm', authenticate, authorize('DRIVER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = notesSchema.parse(req.body);
    const result = await confirmDispatch({ shipmentId: req.params.id, notes: data.notes, staffId: req.user!.id });
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/shipments/:id/proof-of-delivery', authenticate, authorize('DRIVER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = proofOfDeliverySchema.parse(req.body);
    const result = await recordProofOfDelivery({ shipmentId: req.params.id, recipientName: data.recipientName || 'N/A', recipientSignature: data.recipientSignature, deliveryPhoto: data.deliveryPhoto, notes: data.notes, staffId: req.user!.id });
    res.json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

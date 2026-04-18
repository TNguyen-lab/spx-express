import { Router, Response } from 'express';
import { authenticate, type AuthRequest } from '../../../../shared/auth/index.js';
import { createSupplier, listSuppliers } from '../../application/queries/service.js';
import { serializeSupplier, serializeSuppliers } from './serializer.js';
import { sendRouteError } from '../../../../shared/errors/index.js';

const router = Router();

router.get('/suppliers', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const suppliers = await listSuppliers();
    res.json(serializeSuppliers(suppliers));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/suppliers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await createSupplier(req.body);
    res.status(201).json(serializeSupplier(supplier));
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

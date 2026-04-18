import { Router, Response } from 'express';
import { authenticate, type AuthRequest } from '../../../../shared/auth/index.js';
import { createLocation, listLocations } from '../../application/queries/service.js';
import { serializeLocation, serializeLocations } from './serializer.js';
import { sendRouteError } from '../../../../shared/errors/index.js';

const router = Router();

router.get('/locations', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const locations = await listLocations();
    res.json(serializeLocations(locations));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/locations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const location = await createLocation(req.body);
    res.status(201).json(serializeLocation(location));
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

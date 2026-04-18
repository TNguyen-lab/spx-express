import { Router, Response } from 'express';
import { authenticate, type AuthRequest } from '../../../../shared/auth/index.js';
import { sendRouteError } from '../../../../shared/errors/index.js';
import { listInventory } from '../../application/commands/list-inventory.js';
import { serializeInventoryList } from './serializer.js';

const router = Router();

router.get('/inventory', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const inventory = await listInventory();
    res.json(serializeInventoryList(inventory));
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

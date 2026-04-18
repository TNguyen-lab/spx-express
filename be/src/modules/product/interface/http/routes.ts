import { Router, Response } from 'express';
import { authenticate, type AuthRequest } from '../../../../shared/auth/index.js';
import { createProduct, listProducts } from '../../application/queries/service.js';
import { serializeProduct, serializeProducts } from './serializer.js';
import { sendRouteError } from '../../../../shared/errors/index.js';

const router = Router();

router.get('/products', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const result = await listProducts(search as string | undefined, parseInt(page as string), parseInt(limit as string));
    res.json(serializeProducts(result.products, result.total, result.page, result.limit));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post('/products', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const product = await createProduct(req.body);
    res.status(201).json(serializeProduct(product));
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

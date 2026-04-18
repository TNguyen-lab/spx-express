import { Router, Response } from 'express';
import { listEvents } from '../../shared/events/application-event-publisher.js';
import { sendRouteError } from './errors.js';

const router = Router();

router.get('/health', (req, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/events', async (req, res: Response) => {
  try {
    const { process, limit = '100' } = req.query;
    const events = await listEvents(process as string, parseInt(limit as string));
    res.json({ events });
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;

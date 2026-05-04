import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, type AuthRequest } from '../../../../shared/auth/index.js';
import { sendRouteError } from '../../../../shared/errors/index.js';
import { generateOperationProposals } from '../../application/commands/generate-operation-proposals.js';

const router = Router();

const analysisPeriodSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
});

const movementSchema = z.object({
  date: z.string().min(1),
  quantity: z.number().int(),
});

const backlogSchema = z.object({
  date: z.string().min(1),
  count: z.number().int().min(0),
});

const slaSchema = z.object({
  date: z.string().min(1),
  breachRate: z.number().min(0).max(1),
});

const staffingSchema = z.object({
  date: z.string().min(1),
  headcount: z.number().int().min(0),
});

const inventorySchema = z.object({
  productId: z.string().min(1),
  sku: z.string().optional(),
  quantity: z.number().int(),
  minStock: z.number().int().optional(),
  category: z.string().nullable().optional(),
});

const datasetSchema = z.object({
  inventory: z.array(inventorySchema).min(1),
  inbound: z.array(movementSchema),
  outbound: z.array(movementSchema),
  backlog: z.array(backlogSchema).min(1),
  sla: z.array(slaSchema).min(1),
  staffing: z.array(staffingSchema).optional(),
});

const analyzeSchema = z.object({
  warehouse_id: z.string().min(1),
  analysis_period: analysisPeriodSchema,
  dataset: datasetSchema,
  user_context: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    role: z.string().optional(),
  }).optional(),
});

router.post('/analytics/operations/analyze', authenticate, authorize('WAREHOUSE_DIRECTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = analyzeSchema.parse(req.body);
    const result = await generateOperationProposals({
      warehouseId: data.warehouse_id,
      analysisPeriod: data.analysis_period,
      dataset: data.dataset,
      userContext: data.user_context ?? { id: req.user?.id, role: req.user?.role, name: req.user?.name },
    });

    res.status(201).json({
      analysisResult: result.analysisResult,
      proposals: result.proposals,
      auditId: result.auditId,
    });
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;
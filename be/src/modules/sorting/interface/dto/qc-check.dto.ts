import { z } from 'zod';

export const qcCheckDto = z.object({
  passed: z.boolean(),
  notes: z.string().optional(),
});

export type QcCheckDto = z.infer<typeof qcCheckDto>;

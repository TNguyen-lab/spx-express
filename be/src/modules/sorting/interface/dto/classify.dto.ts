import { z } from 'zod';

export const classifyDto = z.object({
  sizeCategory: z.string().optional(),
  zone: z.string().optional(),
  notes: z.string().optional(),
});

export type ClassifyDto = z.infer<typeof classifyDto>;

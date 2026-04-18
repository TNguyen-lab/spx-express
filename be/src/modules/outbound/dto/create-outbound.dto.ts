import { z } from 'zod';

export const createOutboundSchema = z.object({
  orderRef: z.string().min(1).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().positive('Quantity must be positive'),
  }).transform((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }))).min(1, 'At least 1 item is required'),
});

export const assignPickerSchema = z.object({
  pickerId: z.string().min(1, 'Picker ID is required'),
});

export type CreateOutboundDto = z.infer<typeof createOutboundSchema>;
export type AssignPickerDto = z.infer<typeof assignPickerSchema>;

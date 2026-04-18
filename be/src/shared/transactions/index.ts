import type { Prisma } from '@prisma/client';
import prisma from '../../config/db.js';

export function withTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(operation);
}

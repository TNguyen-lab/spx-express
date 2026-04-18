import type { Prisma } from '@prisma/client';
import prisma from '../../../../config/db.js';
import { validateTransition } from '../../domain/aggregates/outbound-policy.js';

export type Tx = Prisma.TransactionClient;

export async function generateOutboundNumber(): Promise<string> {
  const count = await prisma.outbound.count();
  const num = (count + 1).toString().padStart(5, '0');
  return `OUT${new Date().getFullYear()}${num}`;
}

export async function getOutboundOrThrow(id: string) {
  const outbound = await prisma.outbound.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!outbound) {
    throw new Error('Outbound not found');
  }

  return outbound;
}

export async function getOutboundForReservation(tx: Tx, id: string) {
  const outbound = await tx.outbound.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!outbound) {
    throw new Error('Outbound not found');
  }

  return outbound;
}

export { validateTransition };

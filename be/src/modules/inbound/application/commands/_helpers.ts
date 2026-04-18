import prisma from '../../../../config/db.js';

export async function generateInboundNumber(tx?: { inbound: { count: () => Promise<number> } }): Promise<string> {
  const count = tx ? await tx.inbound.count() : await prisma.inbound.count();
  const num = (count + 1).toString().padStart(5, '0');
  return `IN${new Date().getFullYear()}${num}`;
}

export async function getInboundOrThrow(id: string, tx?: { inbound: { findUnique: (args: unknown) => Promise<any> } }) {
  const db = tx ?? prisma;
  const inbound = await db.inbound.findUnique({
    where: { id },
    include: { items: true, purchaseOrder: { include: { supplier: true } } },
  });
  if (!inbound) throw new Error('Inbound not found');
  return inbound;
}

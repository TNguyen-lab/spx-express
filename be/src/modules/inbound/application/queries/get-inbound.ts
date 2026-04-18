import prisma from '../../../../config/db.js';

export async function getInbound(id: string) {
  return prisma.inbound.findUnique({
    where: { id },
    include: {
      purchaseOrder: { include: { supplier: true } },
      staff: { select: { id: true, name: true } },
      items: { include: { product: true, location: true } },
    },
  });
}

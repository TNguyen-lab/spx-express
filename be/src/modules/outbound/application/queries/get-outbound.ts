import prisma from '../../../../config/db.js';

export async function getOutbound(id: string) {
  return prisma.outbound.findUnique({
    where: { id },
    include: {
      picker: { select: { id: true, name: true } },
      items: { include: { product: true, location: true } },
      packing: true,
    },
  });
}

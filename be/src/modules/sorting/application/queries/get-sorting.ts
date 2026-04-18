import prisma from '../../../../config/db.js';

export async function getSorting(id: string) {
  return prisma.sorting.findUnique({
    where: { id },
    include: {
      packing: { include: { outbound: { include: { items: true } } } },
      sorter: { select: { id: true, name: true } },
      shipment: true,
    },
  });
}

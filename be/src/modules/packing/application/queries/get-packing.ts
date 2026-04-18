import prisma from '../../../../config/db.js';

export async function getPacking(id: string) {
  return prisma.packing.findUnique({
    where: { id },
    include: {
      outbound: { include: { items: { include: { product: true } } } },
      packer: { select: { id: true, name: true } },
      sorting: true,
    },
  });
}

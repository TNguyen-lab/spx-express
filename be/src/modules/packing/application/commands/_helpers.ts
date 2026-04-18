import prisma from '../../../../config/db.js';

export function generatePackingNumber(): string {
  return `PK${new Date().getFullYear()}${Date.now().toString().slice(-5)}`;
}

export function generateSortingNumber(): string {
  return `SO${new Date().getFullYear()}${Date.now().toString().slice(-5)}`;
}

export async function getPackingOrThrow(packingId: string) {
  const packing = await prisma.packing.findUnique({
    where: { id: packingId },
    include: {
      outbound: { include: { items: { include: { product: true } } } },
      packer: { select: { id: true, name: true } },
      sorting: true,
    },
  });

  if (!packing) {
    throw new Error('Packing not found');
  }

  return packing;
}

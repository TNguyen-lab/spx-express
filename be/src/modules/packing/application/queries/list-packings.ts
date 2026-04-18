import prisma from '../../../../config/db.js';

export async function listPackings(input: { status?: string; page: number; limit: number }) {
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;

  const packings = await prisma.packing.findMany({
    where,
    include: {
      outbound: { include: { items: { include: { product: true } } } },
      packer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (input.page - 1) * input.limit,
    take: input.limit,
  });

  const total = await prisma.packing.count({ where });

  return { packings, total, page: input.page, limit: input.limit };
}

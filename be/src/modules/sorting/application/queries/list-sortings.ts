import prisma from '../../../../config/db.js';

export async function listSortings(input: { status?: string; page: number; limit: number }) {
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;

  const sortings = await prisma.sorting.findMany({
    where,
    include: {
      packing: { include: { outbound: { include: { items: true } } } },
      sorter: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (input.page - 1) * input.limit,
    take: input.limit,
  });

  const total = await prisma.sorting.count({ where });

  return { sortings, total, page: input.page, limit: input.limit };
}

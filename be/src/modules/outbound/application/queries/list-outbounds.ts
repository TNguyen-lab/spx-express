import prisma from '../../../../config/db.js';

export interface ListOutboundsInput {
  status?: string;
  page: number;
  limit: number;
}

export async function listOutbounds(input: ListOutboundsInput) {
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;

  const [outbounds, total] = await Promise.all([
    prisma.outbound.findMany({
      where,
      include: {
        picker: { select: { id: true, name: true } },
        items: { include: { product: true, location: true } },
        packing: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.outbound.count({ where }),
  ]);

  return { outbounds, total, page: input.page, limit: input.limit };
}

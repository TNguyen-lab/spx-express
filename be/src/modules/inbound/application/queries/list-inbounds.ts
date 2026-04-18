import prisma from '../../../../config/db.js';

export async function listInbounds(input: { status?: string; page: number; limit: number }) {
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;

  const [inbounds, total] = await Promise.all([
    prisma.inbound.findMany({
      where,
      include: {
        purchaseOrder: { include: { supplier: true } },
        staff: { select: { id: true, name: true } },
        items: { include: { product: true, location: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.inbound.count({ where }),
  ]);

  return { inbounds, total, page: input.page, limit: input.limit };
}

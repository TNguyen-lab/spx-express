import prisma from '../../../../config/db.js';

export async function listShipments(input: { status?: string; carrier?: string; page: number; limit: number }) {
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;
  if (input.carrier) where.carrier = input.carrier;

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      include: {
        sorting: { include: { packing: { include: { outbound: true } } } },
        shipper: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.shipment.count({ where }),
  ]);

  return { shipments, total, page: input.page, limit: input.limit };
}

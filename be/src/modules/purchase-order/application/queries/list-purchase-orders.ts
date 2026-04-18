import prisma from '../../../../config/db.js';

export async function listPurchaseOrders(
  filters: { status?: string; supplierId?: string; page: number; limit: number },
) {
  const where: Record<string, unknown> = {}
;
  if (filters.status) where.status = filters.status;
  if (filters.supplierId) where.supplierId = filters.supplierId;

  const orders = await prisma.purchaseOrder.findMany({
    where,
    include: {
      supplier: true,
      createdBy: { select: { id: true, name: true, email: true } },
      items: { include: { product: true } },
      approvals: { include: { approver: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (filters.page - 1) * filters.limit,
    take: filters.limit,
  });

  const total = await prisma.purchaseOrder.count({ where });

  return { orders, total, page: filters.page, limit: filters.limit };
}

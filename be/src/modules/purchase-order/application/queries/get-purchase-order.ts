import prisma from '../../../../config/db.js';

export async function getPurchaseOrder(id: string) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      createdBy: { select: { id: true, name: true, email: true } },
      items: { include: { product: true } },
      approvals: { include: { approver: { select: { name: true } } } },
      inbound: true,
    },
  });
}

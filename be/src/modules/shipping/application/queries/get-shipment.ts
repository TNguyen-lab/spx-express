import prisma from '../../../../config/db.js';

export async function getShipment(shipmentId: string) {
  return prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      sorting: { include: { packing: { include: { outbound: { include: { items: { include: { product: true } } } } } } } },
      shipper: { select: { id: true, name: true } },
    },
  });
}

import prisma from '../../../../config/db.js';
import { ShippingStatus } from '../../../../constants/canonical-status.js';

export async function retryDelivery(input: { shipmentId: string; staffId: string }) {
  const shipment = await prisma.shipment.findUnique({ where: { id: input.shipmentId } });
  if (!shipment) throw new Error('Shipment not found');
  if (shipment.status !== ShippingStatus.FAILED) throw new Error('Shipment not in FAILED status');

  const updated = await prisma.shipment.update({
    where: { id: input.shipmentId },
    data: { status: ShippingStatus.IN_TRANSIT, deliveryNotes: null },
  });

  return { shipment: updated, message: 'Delivery retry initiated' };
}

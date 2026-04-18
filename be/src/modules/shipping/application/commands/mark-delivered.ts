import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { ShippingStatus } from '../../../../constants/canonical-status.js';
import { ShippingEvents } from '../../domain/events/shipping.events.js';

export async function markDelivered(input: { shipmentId: string; recipientName?: string; notes?: string; staffId: string }) {
  const shipment = await prisma.shipment.findUnique({ where: { id: input.shipmentId } });
  if (!shipment) throw new Error('Shipment not found');
  if (shipment.status !== ShippingStatus.IN_TRANSIT && shipment.status !== ShippingStatus.OUT_FOR_DELIVERY) {
    throw new Error('Shipment not in valid status for delivery');
  }

  const updated = await prisma.shipment.update({
    where: { id: input.shipmentId },
    data: {
      status: ShippingStatus.DELIVERED,
      deliveredDate: new Date(),
      deliveryNotes: input.notes || null,
      notes: input.notes ? `${shipment.notes || ''}\nPOD: ${input.notes}`.trim() : shipment.notes,
    },
  });

  await publishEvent(ShippingEvents.ShipmentDelivered, 'Shipment', shipment.id, {
    shipmentNumber: shipment.shipmentNumber,
    recipientName: input.recipientName || 'N/A',
    deliveredAt: new Date().toISOString(),
  }, input.staffId);

  return { shipment: updated, message: 'Delivery confirmed' };
}

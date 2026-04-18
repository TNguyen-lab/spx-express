import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { ShippingStatus } from '../../../../constants/canonical-status.js';
import { ShippingEvents } from '../../domain/events/shipping.events.js';

export async function markOutForDelivery(input: { shipmentId: string; staffId: string }) {
  const shipment = await prisma.shipment.findUnique({ where: { id: input.shipmentId } });
  if (!shipment) throw new Error('Shipment not found');
  if (shipment.status !== ShippingStatus.IN_TRANSIT) throw new Error('Shipment not in IN_TRANSIT status');

  const updated = await prisma.shipment.update({
    where: { id: input.shipmentId },
    data: { status: ShippingStatus.OUT_FOR_DELIVERY },
  });

  await publishEvent(ShippingEvents.ShipmentOutForDelivery, 'Shipment', shipment.id, {
    shipmentNumber: shipment.shipmentNumber,
  }, input.staffId);

  return updated;
}

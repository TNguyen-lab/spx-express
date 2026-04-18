import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { ShippingStatus } from '../../../../constants/canonical-status.js';
import { ShippingEvents } from '../../domain/events/shipping.events.js';

export async function markInTransit(input: { shipmentId: string; staffId: string }) {
  const shipment = await prisma.shipment.findUnique({ where: { id: input.shipmentId } });
  if (!shipment) throw new Error('Shipment not found');
  if (shipment.status !== ShippingStatus.PICKED_UP) throw new Error('Shipment not in PICKED_UP status');

  const updated = await prisma.shipment.update({
    where: { id: input.shipmentId },
    data: { status: ShippingStatus.IN_TRANSIT },
  });

  await publishEvent(ShippingEvents.ShipmentInTransit, 'Shipment', shipment.id, {
    shipmentNumber: shipment.shipmentNumber,
  }, input.staffId);

  return updated;
}

import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { ShippingStatus } from '../../../../constants/canonical-status.js';
import { ShippingEvents } from '../../domain/events/shipping.events.js';

export async function markFailed(input: { shipmentId: string; reason: string; failureType?: string; staffId: string }) {
  const shipment = await prisma.shipment.findUnique({ where: { id: input.shipmentId } });
  if (!shipment) throw new Error('Shipment not found');
  if (shipment.status !== ShippingStatus.IN_TRANSIT && shipment.status !== ShippingStatus.OUT_FOR_DELIVERY) {
    throw new Error('Shipment not in valid status for failure');
  }

  const updated = await prisma.shipment.update({
    where: { id: input.shipmentId },
    data: { status: ShippingStatus.FAILED, deliveryNotes: input.reason || null },
  });

  await publishEvent(ShippingEvents.ShipmentFailed, 'Shipment', shipment.id, {
    shipmentNumber: shipment.shipmentNumber,
    reason: input.reason,
    failureType: input.failureType || 'UNKNOWN',
  }, input.staffId);

  return { shipment: updated, message: 'Delivery failure recorded' };
}

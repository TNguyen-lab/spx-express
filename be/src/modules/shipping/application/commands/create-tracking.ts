import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { ShippingEvents } from '../../domain/events/shipping.events.js';

export interface CreateTrackingInput {
  shipmentId: string;
  trackingNumber?: string;
  staffId: string;
}

function generateTrackingNumber(): string {
  return `TRK${Date.now()}`;
}

export async function createTracking(input: CreateTrackingInput) {
  const shipment = await prisma.shipment.findUnique({ where: { id: input.shipmentId } });

  if (!shipment) throw new Error('Shipment not found');
  if (shipment.status !== 'CREATED' && shipment.status !== 'PICKED_UP') {
    throw new Error('Shipment not in valid status for tracking creation');
  }

  const trackingNumber = input.trackingNumber || generateTrackingNumber();
  const updated = await prisma.shipment.update({
    where: { id: input.shipmentId },
    data: { trackingNumber },
  });

  await publishEvent(ShippingEvents.TrackingCreated, 'Shipment', shipment.id, {
    shipmentNumber: shipment.shipmentNumber,
    trackingNumber,
  }, input.staffId);

  return updated;
}

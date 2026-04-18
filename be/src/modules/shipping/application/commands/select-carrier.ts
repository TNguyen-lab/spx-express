import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { ShippingStatus } from '../../../../constants/canonical-status.js';
import { ShippingEvents } from '../../domain/events/shipping.events.js';

export interface SelectCarrierInput {
  shipmentId: string;
  carrier: string;
  staffId: string;
}

export async function selectCarrier(input: SelectCarrierInput) {
  const shipment = await prisma.shipment.findUnique({ where: { id: input.shipmentId } });

  if (!shipment) throw new Error('Shipment not found');
  if (shipment.status !== ShippingStatus.CREATED) throw new Error('Shipment not in CREATED status');

  const updated = await prisma.shipment.update({
    where: { id: input.shipmentId },
    data: { carrier: input.carrier },
  });

  await publishEvent(ShippingEvents.CarrierSelected, 'Shipment', shipment.id, {
    shipmentNumber: shipment.shipmentNumber,
    carrier: input.carrier,
  }, input.staffId);

  return updated;
}

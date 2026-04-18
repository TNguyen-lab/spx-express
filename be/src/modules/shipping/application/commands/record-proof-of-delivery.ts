import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { ShippingStatus } from '../../../../constants/canonical-status.js';
import { ShippingEvents } from '../../domain/events/shipping.events.js';

export async function recordProofOfDelivery(input: {
  shipmentId: string;
  recipientName: string;
  recipientSignature?: string;
  deliveryPhoto?: string;
  notes?: string;
  staffId: string;
}) {
  const shipment = await prisma.shipment.findUnique({ where: { id: input.shipmentId } });
  if (!shipment) throw new Error('Shipment not found');
  if (shipment.status !== ShippingStatus.OUT_FOR_DELIVERY) throw new Error('Shipment not in OUT_FOR_DELIVERY status');

  const updated = await prisma.shipment.update({
    where: { id: input.shipmentId },
    data: {
      status: ShippingStatus.DELIVERED,
      deliveredDate: new Date(),
      deliveryNotes: input.notes || null,
      notes: `${shipment.notes || ''}\nPOD - Recipient: ${input.recipientName}, Signature: ${input.recipientSignature || 'N/A'}, Photo: ${input.deliveryPhoto || 'N/A'}${input.notes ? ', Notes: ' + input.notes : ''}`.trim(),
    },
  });

  await publishEvent(ShippingEvents.ShipmentDelivered, 'Shipment', shipment.id, {
    shipmentNumber: shipment.shipmentNumber,
    recipientName: input.recipientName,
    deliveredAt: new Date().toISOString(),
  }, input.staffId);

  return { shipment: updated, message: 'Proof of delivery recorded' };
}

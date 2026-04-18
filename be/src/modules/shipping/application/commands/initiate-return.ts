import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { ShippingStatus } from '../../../../constants/canonical-status.js';
import { ShippingEvents } from '../../domain/events/shipping.events.js';

export async function initiateReturn(input: { shipmentId: string; returnNotes?: string; staffId: string }) {
  const shipment = await prisma.shipment.findUnique({ where: { id: input.shipmentId } });
  if (!shipment) throw new Error('Shipment not found');
  if (shipment.status !== ShippingStatus.FAILED) throw new Error('Shipment not in FAILED status');

  const updated = await prisma.shipment.update({
    where: { id: input.shipmentId },
    data: {
      status: ShippingStatus.RETURNED,
      notes: input.returnNotes ? `${shipment.notes || ''}\nReturn: ${input.returnNotes}`.trim() : shipment.notes,
    },
  });

  await publishEvent(ShippingEvents.ReturnInitiated, 'Shipment', shipment.id, {
    shipmentNumber: shipment.shipmentNumber,
    returnNotes: input.returnNotes,
  }, input.staffId);

  return { shipment: updated, message: 'Return initiated' };
}

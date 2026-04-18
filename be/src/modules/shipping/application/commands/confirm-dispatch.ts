import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { ShippingStatus } from '../../../../constants/canonical-status.js';
import { ShippingEvents } from '../../domain/events/shipping.events.js';
import { recordDispatchMovement } from '../../../inventory/application/commands/movements/record-dispatch-movement.js';

export async function confirmDispatch(input: { shipmentId: string; notes?: string; staffId: string }) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: input.shipmentId },
    include: { sorting: { include: { packing: { include: { outbound: { include: { items: true } } } } } } },
  });

  if (!shipment) throw new Error('Shipment not found');
  if (shipment.status !== ShippingStatus.CREATED) throw new Error('Shipment not in CREATED status');

  const updated = await prisma.$transaction(async (tx) => {
    if (shipment.sorting?.packing?.outbound) {
      for (const item of shipment.sorting.packing.outbound.items) {
        await recordDispatchMovement(tx, {
          productId: item.productId,
          quantity: item.quantity,
          referenceType: 'ShipmentDispatch',
          referenceId: shipment.id,
          createdById: input.staffId,
          notes: input.notes || `Dispatch confirmed for shipment ${shipment.shipmentNumber}`,
        });
      }
    }

    return tx.shipment.update({
      where: { id: input.shipmentId },
      data: {
        status: ShippingStatus.PICKED_UP,
        shippedDate: new Date(),
        notes: input.notes ? `${shipment.notes || ''}\nDispatch: ${input.notes}`.trim() : shipment.notes,
      },
    });
  });

  await publishEvent(ShippingEvents.ShipmentPickedUp, 'Shipment', shipment.id, {
    shipmentNumber: shipment.shipmentNumber,
    confirmedAt: new Date().toISOString(),
  }, input.staffId);

  return { shipment: updated, message: 'Dispatch confirmed' };
}

import prisma from '../../../../config/db.js';
import { SortingStatus } from '../../../../constants/canonical-status.js';
import { SortingEvents } from '../../domain/events/sorting.events.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { ShippingEvents } from '../../../shipping/domain/events/shipping.events.js';

function generateShipmentNumber(): string {
  return `SH${new Date().getFullYear()}${Date.now().toString().slice(-5)}`;
}

export async function completeSorting(input: { sortingId: string; carrier?: string; staffId: string }) {
  const sorting = await prisma.sorting.findUnique({ where: { id: input.sortingId } });
  if (!sorting) throw new Error('Sorting not found');
  if (sorting.status !== SortingStatus.SORTED) throw new Error('Sorting not in SORTED status');

  const updated = await prisma.sorting.update({
    where: { id: input.sortingId },
    data: { status: SortingStatus.COMPLETED, completedDate: new Date() },
  });

  const shipment = await prisma.shipment.create({
    data: {
      shipmentNumber: generateShipmentNumber(),
      sortingId: sorting.id,
      shipperId: input.staffId,
      carrier: input.carrier || 'PENDING',
      status: 'CREATED',
    },
  });

  await publishEvent(ShippingEvents.ShipmentCreated, 'Shipment', shipment.id, {
    shipmentNumber: shipment.shipmentNumber,
  }, input.staffId);

  await publishEvent(SortingEvents.Completed, 'Sorting', sorting.id, {
    sortingNumber: sorting.sortingNumber,
    shipmentNumber: shipment.shipmentNumber,
  }, input.staffId);

  return { sorting: updated, shipment };
}

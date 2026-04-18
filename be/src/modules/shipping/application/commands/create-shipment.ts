import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { ShippingStatus } from '../../../../constants/canonical-status.js';
import { ShippingEvents } from '../../domain/events/shipping.events.js';

export interface CreateShipmentInput {
  sortingId: string;
  shipperId: string;
  carrier?: string;
  userId: string;
}

export async function createShipment(input: CreateShipmentInput) {
  const sorting = await prisma.sorting.findUnique({
    where: { id: input.sortingId },
  });

  if (!sorting || sorting.status !== 'COMPLETED') {
    throw new Error('Sorting not found or not completed');
  }

  const existingShipment = await prisma.shipment.findUnique({
    where: { sortingId: input.sortingId },
    include: {
      sorting: true,
      shipper: { select: { id: true, name: true } },
    },
  });

  if (existingShipment) {
    return existingShipment;
  }

  const shipmentNumber = `SH${new Date().getFullYear()}${Date.now().toString().slice(-5)}`;

  const shipment = await prisma.shipment.create({
    data: {
      shipmentNumber,
      sortingId: input.sortingId,
      shipperId: input.shipperId,
      carrier: input.carrier || 'PENDING',
      status: ShippingStatus.CREATED,
    },
    include: {
      sorting: true,
      shipper: { select: { id: true, name: true } },
    },
  });

  await publishEvent(ShippingEvents.ShipmentCreated, 'Shipment', shipment.id, {
    shipmentNumber: shipment.shipmentNumber,
    sortingId: input.sortingId,
    carrier: shipment.carrier,
  }, input.userId);

  return shipment;
}

import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { OutboundEvents } from '../../domain/events/outbound.events.js';
import { generateOutboundNumber } from './_shared.js';

export interface CreateOutboundInput {
  orderRef?: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number }>;
  userId: string;
}

export async function createOutbound(input: CreateOutboundInput) {
  const outboundNumber = await generateOutboundNumber();

  const outbound = await prisma.outbound.create({
    data: {
      outboundNumber,
      orderRef: input.orderRef,
      pickerId: input.userId,
      status: 'ORDER_RECEIVED',
      notes: input.notes,
      items: {
        create: input.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      picker: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
  });

  const payload = {
    outboundNumber: outbound.outboundNumber,
    orderRef: outbound.orderRef,
  };

  await publishEvent(OutboundEvents.Created, 'Outbound', outbound.id, payload, input.userId);
  await publishEvent(OutboundEvents.OrderReceived, 'Outbound', outbound.id, payload, input.userId);

  return outbound;
}

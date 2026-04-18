import prisma from '../../../../config/db.js';
import type { Prisma } from '@prisma/client';
import { PackingStatus } from '../../../../constants/canonical-status.js';
import { OutboundEvents } from '../../../outbound/domain/events/outbound.events.js';
import { subscriberRegistry } from '../../../../events/subscribers.js';
import { generatePackingNumber } from '../commands/_helpers.js';

export async function handleOutboundMovedToPackingEvent(input: {
  outboundId: string;
  outboundNumber: string;
  packingNumber?: string;
  userId: string;
  tx: Prisma.TransactionClient;
}) {
  const client = input.tx;

  const existing = await client.packing.findUnique({ where: { outboundId: input.outboundId } });
  if (existing) return existing;

  const packing = await client.packing.create({
    data: {
      packingNumber: input.packingNumber || generatePackingNumber(),
      outboundId: input.outboundId,
      packerId: input.userId,
      status: PackingStatus.PENDING,
    },
  });

  return packing;
}

export function registerOutboundMovedToPackingHandler(): void {
  subscriberRegistry.subscribe(OutboundEvents.MovedToPacking, async (payload) => {
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const outboundId = String(payload.entityId || data.outboundId || '');
    const outboundNumber = String(data.outboundNumber || '');
    const packingNumber = data.packingNumber ? String(data.packingNumber) : undefined;
    const userId = String(payload.userId || '');

    if (!outboundId || !outboundNumber || !userId) {
      throw new Error('Missing outbound moved to packing payload');
    }

    await prisma.$transaction(async (tx) => handleOutboundMovedToPackingEvent({
      outboundId,
      outboundNumber,
      packingNumber,
      userId,
      tx,
    }));
  }, 'Create packing when outbound moves to packing');
}

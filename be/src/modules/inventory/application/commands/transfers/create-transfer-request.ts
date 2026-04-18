import { publishEvent } from '../../../../../shared/events/application-event-publisher.js';
import { TransferEvents } from '../../../domain/events/transfer.events.js';
import { createTransferRequest as createTransferRequestService, type CreateTransferInput } from './index.js';

export type { CreateTransferInput };

export async function createTransferRequest(tx: Parameters<typeof createTransferRequestService>[0], input: CreateTransferInput) {
  const transfer = await createTransferRequestService(tx, input);
  await publishEvent(TransferEvents.Requested, 'Transfer', transfer.id, {
    transferNumber: transfer.transferNumber,
    fromLocationId: input.fromLocationId,
    toLocationId: input.toLocationId,
    itemCount: input.items.length,
  }, input.requestedById);
  return transfer;
}

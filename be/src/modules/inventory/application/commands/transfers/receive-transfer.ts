import { publishEvent } from '../../../../../shared/events/application-event-publisher.js';
import { TransferEvents } from '../../../domain/events/transfer.events.js';
import { receiveTransfer as receiveTransferService, type ReceiveTransferInput } from './index.js';

export type { ReceiveTransferInput };

export async function receiveTransfer(tx: Parameters<typeof receiveTransferService>[0], input: ReceiveTransferInput) {
  const transfer = await receiveTransferService(tx, input);
  await publishEvent(TransferEvents.Received, 'Transfer', transfer.id, { transferNumber: transfer.transferNumber, itemCount: input.items.length }, input.staffId);
  return transfer;
}

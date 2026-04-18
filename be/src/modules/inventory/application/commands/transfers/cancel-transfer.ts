import { publishEvent } from '../../../../../shared/events/application-event-publisher.js';
import { TransferEvents } from '../../../domain/events/transfer.events.js';
import { cancelTransfer as cancelTransferService, type CancelTransferInput } from './index.js';

export type { CancelTransferInput };

export async function cancelTransfer(tx: Parameters<typeof cancelTransferService>[0], input: CancelTransferInput) {
  const transfer = await cancelTransferService(tx, input);
  await publishEvent(TransferEvents.Cancelled, 'Transfer', transfer.id, { transferNumber: transfer.transferNumber, reason: input.reason }, input.staffId);
  return transfer;
}
